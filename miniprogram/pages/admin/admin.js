const app = getApp()
const db = wx.cloud.database()
const util = require('../../utils/util.js')

Page({
    data: {
        activeTab: 'pending',
        records: [],
        pendingCount: 0,
        approvingRecordIds: [] // 审批按钮锁：存储正在处理的记录ID，防止重复点击
    },

    onLoad() {
        if (!app.globalData.isAdmin) {
            wx.showToast({
                title: '您不是审批人',
                icon: 'none'
            })
            setTimeout(() => {
                wx.navigateBack()
            }, 1000)
            return
        }

        this.getRecords()
    },

    onShow() {
        console.log('管理员页面openid:', app.globalData.openid) // 检查控制台输出
        this.getRecords()
    },

    switchTab(e) {
        const tab = e.currentTarget.dataset.tab
        this.setData({
            activeTab: tab
        })
        this.getRecords()
    },

    // 修改getRecords方法
    getRecords() {
        wx.showLoading({
            title: '加载中...'
        })

        let where = {}
        if (this.data.activeTab === 'pending') {
            where = {
                status: 'pending'
            }
        } else {
            where = {
                status: db.command.in(['approved', 'rejected'])
            }
        }

        db.collection('records')
            .where(where)
            .orderBy('createTime', 'desc')
            .get()
            .then(async res => { // 改为async函数
                wx.hideLoading()

                // 批量查询申请人真实姓名
                const records = res.data
                for (let i = 0; i < records.length; i++) {
                    const record = records[i]
                    // 查询用户真实姓名
                    const userRes = await db.collection('users').where({
                        openid: record.borrowerOpenid
                    }).field({
                        realName: true
                    }).get()

                    // 补充真实姓名字段
                    if (userRes.data.length > 0) {
                        records[i].applicantRealName = userRes.data[0].realName || record.borrowerName
                    } else {
                        records[i].applicantRealName = record.borrowerName
                    }
                }

                // 更新未读状态
                const unreadIds = records.filter(item => !item.isRead && item.status === 'pending').map(item => item._id)
                if (unreadIds.length > 0) {
                    db.collection('records').where({
                        _id: db.command.in(unreadIds)
                    }).update({
                        data: {
                            isRead: true
                        }
                    }).then(() => app.checkUnreadNotifications())
                }

                // 统计待审批数量
                db.collection('records').where({
                    status: 'pending'
                }).count().then(countRes => {
                    this.setData({
                        pendingCount: countRes.total
                    })
                })

                this.setData({
                    records
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

    approveRecord(e) {
        const recordId = e.currentTarget.dataset.id
        const approved = e.currentTarget.dataset.approved === 'true'

        console.log(approved)

        // 前端按钮锁：防止重复提交
        if (this.data.approvingRecordIds.includes(recordId)) {
            wx.showToast({ title: '正在处理中，请稍候', icon: 'none' })
            return
        }

        wx.showModal({
            title: approved ? '确认批准' : '确认拒绝',
            content: approved ? '确定要批准该申请吗？' : '确定要拒绝该申请吗？',
            success: res => {
                if (res.confirm) {
                    // 添加按钮锁
                    this.setData({
                        approvingRecordIds: [...this.data.approvingRecordIds, recordId]
                    })

                    this.processApproval(recordId, approved)
                }
            }
        })
    },

    processApproval(recordId, approved) {
        console.log(approved)
        wx.showLoading({
            title: '处理中...'
        })

        wx.cloud.callFunction({
            name: 'approveRecord',
            data: {
                recordId,
                approved
            },
            success: res => {
                wx.hideLoading()
                // 移除按钮锁
                this.setData({
                    approvingRecordIds: this.data.approvingRecordIds.filter(id => id !== recordId)
                })
                if (res.result.success) {
                    wx.showToast({
                        title: approved ? '已批准' : '已拒绝',
                        icon: 'success'
                    })
                    this.getRecords()
                    // 修复：审批后刷新全局未读数量
                    app.checkUnreadNotifications()
                } else {
                    console.log(res.result.message)
                    wx.showToast({
                        title: '操作失败',
                        icon: 'none'
                    })
                }
            },
            fail: err => {
                wx.hideLoading()
                // 移除按钮锁
                this.setData({
                    approvingRecordIds: this.data.approvingRecordIds.filter(id => id !== recordId)
                })
                console.error('审批失败', err)
                wx.showToast({
                    title: '审批失败',
                    icon: 'none'
                })
            }
        })
    },

    formatTime(time) {
        return util.formatTime(new Date(time))
    }
})