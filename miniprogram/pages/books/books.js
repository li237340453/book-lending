// pages/books/books.js

const app = getApp()
const db = wx.cloud.database()

Page({
    data: {
        books: [],
        searchKey: '',
        openid: null,
        filteredBooks: [],
        borrowingBookIds: [] // 记录正在发起借阅的图书ID，防止重复点击
    },


    /**  这一段异步代码需要保留，之后视情况更新
     * async onLoad() {
      // 调用waitLogin等待openid
      await app.waitLogin()
      this.setData({
        openid: app.globalData.openid
      })
      this.getBooks()
    },
     */
    onLoad() {
        this.setData({
            openid: app.globalData.openid
        })
        this.getBooks()
    },
    onShow() {
        this.getBooks()
    },
    // 新增：下拉刷新触发
    onPullDownRefresh() {
        // 显示顶部刷新图标
        wx.showNavigationBarLoading()

        // 重新获取数据
        this.getBooks(true)
    },


    // 修改：添加isRefresh参数，标记是否是下拉刷新
    getBooks(isRefresh = false) {
        // 如果是下拉刷新，不显示加载中提示（用顶部的loading）
        if (!isRefresh) {
            wx.showLoading({
                title: '加载中...'
            })
        }

        db.collection('books').get().then(res => {
            // 停止下拉刷新动画
            wx.stopPullDownRefresh()
            // 隐藏加载中提示
            wx.hideLoading()
            // 停止导航栏loading
            wx.hideNavigationBarLoading()

            this.setData({
                books: res.data
            })
        }).catch(err => {
            // 出错时也需要停止所有加载状态
            wx.stopPullDownRefresh()
            wx.hideLoading()
            wx.hideNavigationBarLoading()

            console.error('获取图书失败', err)
            wx.showToast({
                title: '获取图书失败',
                icon: 'none'
            })
        })
    },

    onSearchInput(e) {
        this.setData({
            searchKey: e.detail.value
        })
        // 可以在这里实现搜索过滤逻辑
    },
    handleBorrow(e) {
        const bookId = e.currentTarget.dataset.id
        const bookName = e.currentTarget.dataset.name

        // 1. 检查是否正在发起该图书的借阅（防止重复点击）
        if (this.data.borrowingBookIds.includes(bookId)) {
          wx.showToast({ title: '请勿重复提交申请', icon: 'none' })
          return
        }
        console.log(bookId)

        // 2. 先获取最新的图书状态（前端前置校验）
        const currentBook = this.data.books.find(book => book._id === bookId)
        if (!currentBook) {
          wx.showToast({ title: '图书信息不存在', icon: 'none' })
          return
        }

        // 3. 检查图书状态是否为可借阅
        if (currentBook.status !== 'available') {
          wx.showToast({ 
            title: currentBook.status === 'pending' ? '已有用户发起借阅申请' : '图书已被借出', 
            icon: 'none' 
          })
          return
        }

        // 4. 标记为正在借阅中，禁用按钮
        this.setData({
          borrowingBookIds: [...this.data.borrowingBookIds, bookId]
        })

        // 5. 发起借阅申请
        this.addRecord(bookId, bookName, 'borrow')

        // wx.showModal({
        //     title: '确认借阅',
        //     content: `确定要借阅《${bookName}》吗？`,
        //     success: res => {
        //         if (res.confirm) {
        //             this.addRecord(bookId, bookName, 'borrow')
        //         }
        //     }
        // })
    },
    handleReturn(e) {
        const bookId = e.currentTarget.dataset.id
        const bookName = e.currentTarget.dataset.name

        wx.showModal({
            title: '确认归还',
            content: `确定要归还《${bookName}》吗？`,
            success: res => {
                if (res.confirm) {
                    this.addRecord(bookId, bookName, 'return')
                }
            }
        })
    },
    addRecord(bookId, bookName, type) {
        wx.showLoading({
            title: '处理中...'
        })

        wx.cloud.callFunction({
            name: 'addRecord',
            data: {
                bookId,
                bookName,
                borrowerOpenid: app.globalData.openid,
                borrowerName: app.globalData.userInfo.nickName,
                type
            },
            success: res => {
                wx.hideLoading()

                // 移除借阅锁
                this.setData({
                  borrowingBookIds: this.data.borrowingBookIds.filter(id => id !== bookId)
                })

                if (res.result.success) {
                  wx.showToast({
                    title: type === 'borrow' ? '借阅申请已提交' : '归还成功',
                    icon: 'success'
                  })
                  this.getBooks() // 刷新列表，更新图书状态
                } else {
                  // 云函数返回失败（如并发冲突）
                  wx.showToast({ 
                    title: res.result.message || '操作失败，该图书已有借阅申请', 
                    icon: 'none' 
                  })
                }
            },
            fail: err => {
                wx.hideLoading()
                // 移除借阅锁
                this.setData({
                  borrowingBookIds: this.data.borrowingBookIds.filter(id => id !== bookId)
                })
                console.error('操作失败', err)
                wx.showToast({ title: '网络错误，请重试', icon: 'none' })
            }
        })
    }
})