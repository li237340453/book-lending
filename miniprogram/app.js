// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   如不填则使用默认环境（第一个创建的环境）
      env: ""
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }

    wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            // 已经授权，可以直接调用 getUserInfo 获取头像昵称
            wx.getUserInfo({
              success: res => {
                this.globalData.userInfo = res.userInfo
                
                // 登录云函数获取用户信息
                this.login()
              }
            })
          }
        }
      })
  },

  login() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        this.globalData.openid = res.result.openid
        this.globalData.isAdmin = res.result.isAdmin
        
        // 检查是否有未读通知
        if (this.globalData.isAdmin) {
          this.checkUnreadNotifications()
        }
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    })
  },
  
  checkUnreadNotifications() {
    const db = wx.cloud.database()
    db.collection('records').where({
      status: 'pending',
      isRead: false
    }).count().then(res => {
      this.globalData.unreadCount = res.total
    })
  },
  
  globalData: {
    userInfo: null,
    openid: null,
    isAdmin: false,
    unreadCount: 0
  }

});
