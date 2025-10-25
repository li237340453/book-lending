const app = getApp()
const db = wx.cloud.database()
const util = require('../../utils/util.js')

Page({
  data: {
    activeTab: 'pending',
    records: [],
    pendingCount: 0
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
    this.getRecords()
  },
  
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab
    })
    this.getRecords()
  },
  
  getRecords() {
    wx.showLoading({
      title: '加载中...'
    })
    
    let where = {}
    if (this.data.activeTab === 'pending') {
      where = { status: 'pending' }
    } else {
      where = { status: db.command.in(['approved', 'rejected']) }
    }
    
    db.collection('records')
      .where(where)
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        wx.hideLoading()
        
        // 更新未读状态为已读
        const unreadIds = res.data.filter(item => !item.isRead && item.status === 'pending').map(item => item._id)
        if (unreadIds.length > 0) {
          db.collection('records').where({
            _id: db.command.in(unreadIds)
          }).update({
            data: { isRead: true }
          }).then(() => {
            app.checkUnreadNotifications()
          })
        }
        
        // 统计待审批数量
        db.collection('records').where({ status: 'pending' }).count().then(countRes => {
          this.setData({
            pendingCount: countRes.total
          })
        })
        
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
  
  approveRecord(e) {
    const recordId = e.currentTarget.dataset.id
    const approved = e.currentTarget.dataset.approved
    
    wx.showModal({
      title: approved ? '确认批准' : '确认拒绝',
      content: approved ? '确定要批准该申请吗？' : '确定要拒绝该申请吗？',
      success: res => {
        if (res.confirm) {
          this.processApproval(recordId, approved)
        }
      }
    })
  },
  
  processApproval(recordId, approved) {
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
        if (res.result.success) {
          wx.showToast({
            title: approved ? '已批准' : '已拒绝',
            icon: 'success'
          })
          this.getRecords()
        } else {
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          })
        }
      },
      fail: err => {
        wx.hideLoading()
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