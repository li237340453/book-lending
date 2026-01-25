const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    book: {},        // 图书详情
    openid: null,
    borrowing: false // 借阅按钮锁
  },

  async onLoad(options) {
    // 等待登录，获取openid
    await app.waitLogin()
    this.setData({ openid: app.globalData.openid })
    
    // 从跳转参数获取图书ID，拉取详情
    const bookId = options.id
    this.getBookDetail(bookId)
  },

  // 获取图书详情
  getBookDetail(bookId) {
    wx.showLoading({ title: '加载中...' })
    db.collection('books').doc(bookId).get()
      .then(res => {
        wx.hideLoading()
        this.setData({ book: res.data })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('获取图书详情失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        // 失败后返回列表页
        this.backToList()
      })
  },

  // 状态样式
  getStatusClass(status) {
    switch (status) {
      case 'available': return 'status-available'
      case 'pending': return 'status-pending'
      case 'borrowed': return 'status-borrowed'
      default: return ''
    }
  },

  // 借阅操作
  handleBorrow() {
    const { book } = this.data
    if (this.data.borrowing) return

    this.setData({ borrowing: true })
    wx.cloud.callFunction({
      name: 'addRecord',
      data: {
        bookId: book._id,
        bookName: book.name,
        borrowerOpenid: app.globalData.openid,
        borrowerName: app.globalData.userInfo.nickName,
        type: 'borrow'
      },
      success: res => {
        this.setData({ borrowing: false })
        if (res.result.success) {
          wx.showToast({ title: '借阅申请已提交', icon: 'success' })
          // 刷新图书状态
          this.getBookDetail(book._id)
        } else {
          wx.showToast({ title: res.result.message || '操作失败', icon: 'none' })
        }
      },
      fail: err => {
        this.setData({ borrowing: false })
        console.error('借阅失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 归还操作
  handleReturn() {
    const { book } = this.data
    wx.cloud.callFunction({
      name: 'addRecord',
      data: {
        bookId: book._id,
        bookName: book.name,
        borrowerOpenid: app.globalData.openid,
        borrowerName: app.globalData.userInfo.nickName,
        type: 'return'
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({ title: '归还成功', icon: 'success' })
          // 刷新图书状态
          this.getBookDetail(book._id)
        } else {
          wx.showToast({ title: res.result.message || '操作失败', icon: 'none' })
        }
      },
      fail: err => {
        console.error('归还失败', err)
        wx.showToast({ title: '网络错误', icon: 'none' })
      }
    })
  },

  // 返回列表页（保留搜索状态）
  backToList() {
    wx.navigateBack({
      delta: 1 // 返回上一级页面
    })
  }
})