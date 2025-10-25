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
    }

});
