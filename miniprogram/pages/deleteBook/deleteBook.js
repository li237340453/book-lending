const app = getApp()
const db = wx.cloud.database()
Page({
  data: {
    books: [],
    loading: true,
    deletingBookIds: []
  },
  onLoad() { this.getBooksList() },
  onShow() { this.getBooksList() }, // 返回时刷新列表
  // 获取图书列表
  getBooksList() {
    this.setData({ loading: true })
    db.collection('books').get()
      .then(res => this.setData({ books: res.data || [], loading: false }))
      .catch(err => {
        console.error('加载列表失败', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
        this.setData({ loading: false })
      })
  },
  // 删除图书核心逻辑
  deleteBook(e) {
    const bookId = e.currentTarget.dataset.id
    if (this.data.deletingBookIds.includes(bookId)) return

    // 先获取图书信息，以便获取封面URL
    db.collection('books').doc(bookId).get()
      .then(res => {
        const book = res.data
        // 二次确认（危险操作）
        wx.showModal({
          title: '确认删除',
          content: '删除后该图书及封面图片将无法恢复，是否继续？',
          confirmColor: '#f43f30',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.setData({ deletingBookIds: [...this.data.deletingBookIds, bookId] })
              this.deleteBookWithCover(bookId, book.coverUrl)
            }
          }
        })
      })
      .catch(err => {
        console.error('获取图书信息失败', err)
        wx.showToast({ title: '获取图书信息失败', icon: 'none' })
      })
  },

  // 删除图书和封面图片
  deleteBookWithCover(bookId, coverUrl) {
    // 删除数据库记录
    db.collection('books').doc(bookId).remove()
      .then(() => {
        // 如果有封面，删除云存储中的图片
        if (coverUrl) {
          return this.deleteCloudFile(coverUrl)
        }
        return Promise.resolve()
      })
      .then(() => {
        wx.showToast({ title: '删除成功', icon: 'success' })
        this.setData({ deletingBookIds: this.data.deletingBookIds.filter(id => id !== bookId) })
        this.getBooksList()
      })
      .catch(err => {
        console.error('删除失败', err)
        wx.showToast({ title: '删除失败，请重试', icon: 'none' })
        this.setData({ deletingBookIds: this.data.deletingBookIds.filter(id => id !== bookId) })
      })
  },

  // 删除云存储文件
  deleteCloudFile(fileUrl) {
    return new Promise((resolve) => {
      // 从云存储URL中提取文件ID
      const fileId = fileUrl

      wx.cloud.deleteFile({
        fileList: [fileId]
      })
        .then(res => {
          if (res.fileList && res.fileList[0] && res.fileList[0].status === 0) {
            console.log('云文件删除成功', fileId)
            resolve()
          } else {
            console.warn('云文件删除失败，但继续流程', res)
            resolve() // 即使文件删除失败也继续，避免影响主流程
          }
        })
        .catch(err => {
          console.warn('删除云文件异常，但继续流程', err)
          resolve() // 即使文件删除失败也继续，避免影响主流程
        })
    })
  }
})