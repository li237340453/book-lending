const app = getApp()
Page({
  onLoad() {
    // 可选：管理员权限校验（统一校验，子页面可省略）
    // const adminOpenids = ['你的管理员openid1', '你的管理员openid2']
    // if (!adminOpenids.includes(app.globalData.openid)) {
    //   wx.showToast({ title: '无管理员权限', icon: 'none' })
    //   wx.navigateBack()
    //   return
    // }
  },
  // 跳转录入新图书页
  gotoAddBook() {
    wx.navigateTo({
      url: '/pages/addBook/addBook'
    })
  },
  // 跳转删除图书页
  gotoDeleteBook() {
    wx.navigateTo({
      url: '/pages/deleteBook/deleteBook'
    })
  }
})