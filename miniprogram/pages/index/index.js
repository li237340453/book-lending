// index.js

const app = getApp()
Page({
    data: {
        userInfo: null,
        isAdmin: false,
        unreadCount: 0
    },

    onLoad() {
        // 监听全局数据变化
        this.watchGlobalData()
    },

    onShow() {
        // 刷新页面数据
        this.setData({
            userInfo: app.globalData.userInfo,
            isAdmin: app.globalData.isAdmin,
            unreadCount: app.globalData.unreadCount
        })
    },

    watchGlobalData() {
        const that = this
        // 简单的全局数据监听实现
        setInterval(() => {
            if (
                that.data.userInfo !== app.globalData.userInfo ||
                that.data.isAdmin !== app.globalData.isAdmin ||
                that.data.unreadCount !== app.globalData.unreadCount
            ) {
                that.setData({
                    userInfo: app.globalData.userInfo,
                    isAdmin: app.globalData.isAdmin,
                    unreadCount: app.globalData.unreadCount
                })
            }
        }, 1000)
    },

    // 新增扫码功能
    scanCode() {
        wx.scanCode({
            onlyFromCamera: true, // 只允许相机扫码
            scanType: ['qrCode'], // 只识别二维码
            success: (res) => {
                // 假设二维码内容为图书的_id（提前将图书_id生成二维码贴在书上）
                const bookId = res.result
                if (bookId) {
                    // 跳转至图书详情页
                    wx.navigateTo({
                        url: `/pages/bookDetail/bookDetail?id=${bookId}`
                    })
                } else {
                    wx.showToast({
                        title: '未识别到图书信息',
                        icon: 'none'
                    })
                }
            },
            fail: (err) => {
                console.error('扫码失败', err)
                wx.showToast({
                    title: '扫码失败，请重试',
                    icon: 'none'
                })
            }
        })
    }



});
