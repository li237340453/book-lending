const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    newBook: { 
      name: '', 
      author: '', 
      pages: '', 
      publisher: '', 
      publishTime: '', 
      intro: '',
      coverUrl: '', // 封面图片URL
      location: ''  // 手动输入的位置文字
    },
    submitting: false
  },

  // 表单输入统一处理（包含位置、封面外的所有字段）
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    const value = e.detail.value.trim()
    this.setData({ [`newBook.${field}`]: value })
  },

  // 选择/拍摄图书封面（保留，修复小程序端上传写法）
  chooseCoverImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'], // 相册+拍照
      sizeType: ['compressed'], // 压缩图片，节省空间
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadCoverToCloud(tempFilePath) // 上传到云存储
      },
      fail: (err) => {
        console.error('选择图片失败', err)
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  // 上传封面到云存储（小程序端原生写法，无fs依赖）
  uploadCoverToCloud(tempFilePath) {
    wx.showLoading({ title: '上传封面中...' })
    // 生成唯一文件名，避免重复（图书封面专属文件夹）
    const fileName = `book-covers/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`

    wx.cloud.uploadFile({
      cloudPath: fileName, // 云存储路径
      filePath: tempFilePath, // 本地临时文件路径
      success: (uploadRes) => {
        wx.hideLoading()
        // 保存云存储文件ID作为封面URL
        this.setData({ 'newBook.coverUrl': uploadRes.fileID })
        wx.showToast({ title: '封面上传成功', icon: 'success' })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('封面上传失败', err)
        wx.showToast({ title: '封面上传失败，可跳过', icon: 'none' })
      }
    })
  },

  // 录入图书核心逻辑（包含封面+手动位置，无定位代码）
  addNewBook() {
    const { name, author } = this.data.newBook
    // 必填项校验（名称、作者为必填）
    if (!name) { wx.showToast({ title: '图书名称不能为空', icon: 'none' }); return }
    if (!author) { wx.showToast({ title: '作者不能为空', icon: 'none' }); return }
    if (this.data.submitting) return // 防止重复提交

    this.setData({ submitting: true })
    // 构造最终提交的图书数据
    const bookData = {
      name, 
      author,
      pages: this.data.newBook.pages || '',
      publisher: this.data.newBook.publisher || '',
      publishTime: this.data.newBook.publishTime || '',
      intro: this.data.newBook.intro || '',
      coverUrl: this.data.newBook.coverUrl || '', // 封面URL（可选）
      location: this.data.newBook.location || '', // 手动输入的位置（可选）
      status: 'available', // 默认可借阅
    //   currentBorrower: '',
    //   currentBorrowerName: ''
    }

    // 新增到云数据库books集合
    db.collection('books').add({ data: bookData })
      .then(() => {
        wx.showToast({ title: '录入成功', icon: 'success', duration: 1500 })
        // 重置表单，方便继续录入
        this.setData({
          submitting: false,
          newBook: { 
            name: '', author: '', pages: '', publisher: '', 
            publishTime: '', intro: '', coverUrl: '', location: '' 
          }
        })
      })
      .catch(err => {
        console.error('录入失败', err)
        wx.showToast({ title: '录入失败，请重试', icon: 'none' })
        this.setData({ submitting: false })
      })
  }
})