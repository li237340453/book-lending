App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        traceUser: true,
      })
    }

    // 获取用户信息并初始化
    this.getUserInfoAndInit()
  },

  // 获取用户信息并初始化用户数据
  getUserInfoAndInit() {
    const that = this
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已授权，直接获取用户信息
          wx.getUserInfo({
            success: userRes => {
              that.globalData.userInfo = userRes.userInfo
              // 调用云函数初始化用户
              that.initUser(userRes.userInfo)
            }
          })
        } else {
          // 未授权，引导用户授权
          wx.authorize({
            scope: 'scope.userInfo',
            success() {
              wx.getUserInfo({
                success: userRes => {
                  that.globalData.userInfo = userRes.userInfo
                  that.initUser(userRes.userInfo)
                }
              })
            }
          })
        }
      }
    })
  },

  // 初始化用户到数据库
  initUser(userInfo) {
    const that = this
    wx.cloud.callFunction({
      name: 'initUser',
      data: {
        nickname: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl
      },
      success: res => {
        if (res.result.success) {
          // 初始化成功后获取登录信息
          that.login()
        } else {
          console.error('初始化用户失败', res.result.error)
        }
      },
      fail: err => {
        console.error('调用initUser失败', err)
      }
    })
  },

  // 登录获取openid和角色
  login() {
    const that = this
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        that.globalData.openid = res.result.openid
        that.globalData.isAdmin = res.result.isAdmin

        // 检查管理员未读通知
        if (that.globalData.isAdmin) {
          that.checkUnreadNotifications()
        }
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    })
  },

  checkUnreadNotifications() {
    // 原有代码保持不变
  },

  globalData: {
    userInfo: null,
    openid: null,
    isAdmin: false,
    unreadCount: 0
  }
})