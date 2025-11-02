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

        // 初始化登录状态管理（补充定义）
        this.loginStatus = {
            completed: false,
            callback: null
        }

        // 获取用户信息并初始化
        this.getUserInfoAndInit()
    },

    // 等待登录完成的方法
    waitLogin() {
        return new Promise((resolve) => {
            if (this.loginStatus.completed) {
                resolve()
            } else {
                this.loginStatus.callback = resolve
            }
        })
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
                nickname: userInfo.nickName, //存储用户名
                avatarUrl: userInfo.avatarUrl //存储用户头像
            },
            success: res => {
                if (res.result.success) {
                    that.globalData.infoCompleted = res.result.infoCompleted

                    // 关键修复：无论是否首次登录，先执行login获取openid
                    that.login().then(() => {
                        // 获取openid后，再判断是否需要跳转个人中心
                        if (res.result.isNewUser || !res.result.infoCompleted) {
                            setTimeout(() => {
                                wx.redirectTo({
                                    url: `/pages/profile/profile?isFirstLogin=${!res.result.infoCompleted}`
                                })
                            }, 500)
                        }
                    })
                }
            },
            fail: err => {
                console.error('调用initUser失败', err)
            }
        })
    },

    // 登录获取openid和角色
    // 修改login为返回Promise，确保可等待
    login() {
        const that = this
        return new Promise((resolve) => {
            wx.cloud.callFunction({
                name: 'login',
                data: {},
                success: res => {
                    that.globalData.openid = res.result.openid
                    that.globalData.isAdmin = res.result.isAdmin
                    that.loginStatus.completed = true

                    if (that.loginStatus.callback) {
                        that.loginStatus.callback()
                    }
                    if (that.globalData.isAdmin) {
                        that.checkUnreadNotifications()
                    }
                    resolve() // 登录完成，触发后续逻辑
                },
                fail: err => {
                    console.error('[云函数] [login] 调用失败', err)
                    resolve() // 即使失败也继续，避免阻塞
                }
            })
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
        unreadCount: 0,
        infoCompleted: false // 新增：标记个人信息是否完善
    }
})