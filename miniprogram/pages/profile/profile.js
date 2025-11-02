const app = getApp()
const db = wx.cloud.database()

Page({
    data: {
        userInfo: null,
        isAdmin: false,
        // 关键修复：初始化profileInfo为包含所有字段的对象，避免undefined
        profileInfo: {
            realName: '',
            stuId: '',
            phone: ''
        },
        isFirstLogin: false // 是否首次登录
    },

    onLoad(options) {
        console.log('个人中心获取到的openid：', app.globalData.openid)
        // 接收是否首次登录的参数
        this.setData({
            isFirstLogin: options.isFirstLogin === 'true',
            userInfo: app.globalData.userInfo,
            isAdmin: app.globalData.isAdmin
        })
        this.getProfileInfo()
    },

    // 获取个人信息
    getProfileInfo() {
        wx.showLoading({
            title: '加载中...'
        })
        console.log(app.globalData)

        db.collection('users').where({
            openid: app.globalData.openid
        }).get().then(res => {
            wx.hideLoading()
            if (res.data.length > 0) {
                this.setData({
                    profileInfo: {
                        realName: res.data[0].realName || '',
                        stuId: res.data[0].stuId || '',
                        phone: res.data[0].phone || ''
                    }
                })
            }
        }).catch(err => {
            wx.hideLoading()
            console.error('获取个人信息失败', err)
            wx.showToast({
                title: '加载失败',
                icon: 'none'
            })
        })
    },

    // 输入框变化
    onInputChange(e) {
        const field = e.currentTarget.dataset.field
        const value = e.detail.value
        this.setData({
            [`profileInfo.${field}`]: value
        })
    },

    // 保存个人信息
    saveProfile() {
        console.log(this.profileInfo)
        // 解构时从data中获取，避免直接访问this.profileInfo
        const {
            realName,
            stuId,
            phone
        } = this.data.profileInfo

        // 首次登录必须填写姓名和学号/工号
        if (this.data.isFirstLogin && (!realName || !stuId)) {
            wx.showToast({
                title: '姓名和学号/工号为必填项',
                icon: 'none'
            })
            return
        }

        wx.showLoading({
            title: '保存中...'
        })

        db.collection('users').where({
            openid: app.globalData.openid
        }).update({
            data: {
                realName,
                stuId,
                phone,
                infoCompleted: true // 标记信息已完善
            }
        }).then(res => {
            wx.hideLoading()
            wx.showToast({
                title: '信息保存成功',
                icon: 'success'
            })

            // 首次登录完善信息后跳转首页
            if (this.data.isFirstLogin) {
                setTimeout(() => {
                    wx.switchTab({
                        url: '/pages/index/index'
                    })
                }, 1000)
            }
        }).catch(err => {
            wx.hideLoading()
            console.error('保存信息失败', err)
            wx.showToast({
                title: '保存失败',
                icon: 'none'
            })
        })
    }
})