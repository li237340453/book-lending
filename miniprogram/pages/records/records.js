const app = getApp()
const db = wx.cloud.database()
const util = require('../../utils/util.js')

Page({
    data: {
        records: []
    },
    onLoad() {
        this.getMyRecords()
    },
    onShow() {
        this.getMyRecords()
    },
    getMyRecords() {
        wx.showLoading({
            title: '加载中...'
        })
        db.collection('records')
            .where({
                borrowerOpenid: app.globalData.openid
            })
            .orderBy('createTime', 'desc')
            .get()
            .then(res => {
                wx.hideLoading()
                this.setData({
                    records: res.data
                })
            })
            .catch(err => {
                wx.hideLoading()
                console.error('获取记录失败', err)
                wx.showToast({
                    title: '获取记录失败',
                    icon: 'none'
                })
            })
    },
    getStatusText(status) {
        const statusMap = {
            'pending': '待审批',
            'approved': '已批准',
            'rejected': '已拒绝'
        }
        return statusMap[status] || status
    },

    getStatusClass(status) {
        const classMap = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'rejected': 'status-rejected'
        }
        return classMap[status] || ''
    },

    formatTime(time) {
        return util.formatTime(new Date(time))
    }
})