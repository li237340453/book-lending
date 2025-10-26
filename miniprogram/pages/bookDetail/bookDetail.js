const app = getApp()
const db = wx.cloud.database()

Page({
    data: {
        book: null,
        openid: null
    },

    onLoad(options) {
        // 获取图书ID
        this.bookId = options.id
        this.setData({
            openid: app.globalData.openid
        })
        this.getBookDetail()
    },

    // 获取图书详情
    getBookDetail() {
        wx.showLoading({
            title: '加载中...'
        })

        db.collection('books').doc(this.bookId).get()
            .then(res => {
                wx.hideLoading()
                if (res.data) {
                    this.setData({
                        book: res.data
                    })
                } else {
                    wx.showToast({
                        title: '未找到该图书',
                        icon: 'none'
                    })
                    // 2秒后返回首页
                    setTimeout(() => {
                        wx.navigateBack()
                    }, 2000)
                }
            })
            .catch(err => {
                wx.hideLoading()
                console.error('获取图书详情失败', err)
                wx.showToast({
                    title: '加载失败',
                    icon: 'none'
                })
            })
    },

    // 借阅图书
    handleBorrow() {
        const book = this.data.book
        wx.showModal({
            title: '确认借阅',
            content: `确定要借阅《${book.name}》吗？`,
            success: res => {
                if (res.confirm) {
                    this.addRecord(book._id, book.name, 'borrow')
                }
            }
        })
    },

    // 归还图书
    handleReturn() {
        const book = this.data.book
        wx.showModal({
            title: '确认归还',
            content: `确定要归还《${book.name}》吗？`,
            success: res => {
                if (res.confirm) {
                    this.addRecord(book._id, book.name, 'return')
                }
            }
        })
    },

    // 调用云函数添加记录
    addRecord(bookId, bookName, type) {
        wx.showLoading({
            title: '处理中...'
        })

        wx.cloud.callFunction({
            name: 'addRecord',
            data: {
                bookId,
                bookName,
                borrowerOpenid: app.globalData.openid,
                borrowerName: app.globalData.userInfo.nickName,
                type
            },
            success: res => {
                wx.hideLoading()
                if (res.result.success) {
                    wx.showToast({
                        title: type === 'borrow' ? '借阅申请已提交' : '归还成功',
                        icon: 'success'
                    })
                    // 刷新图书状态
                    setTimeout(() => {
                        this.getBookDetail()
                    }, 1000)
                } else {
                    wx.showToast({
                        title: '操作失败',
                        icon: 'none'
                    })
                }
            },
            fail: err => {
                wx.hideLoading()
                console.error('操作失败', err)
                wx.showToast({
                    title: '操作失败',
                    icon: 'none'
                })
            }
        })
    },

    // 返回图书列表
    gotoBooksList() {
        wx.navigateTo({
            url: '/pages/books/books'
        })
    },

    // 状态文本转换
    getStatusText(status) {
        const statusMap = {
            'available': '可借阅',
            'borrowed': '已借出',
            'pending': '待审批'
        }
        return statusMap[status] || status
    },

    // 状态样式转换
    getStatusClass(status) {
        const classMap = {
            'available': 'status-available',
            'borrowed': 'status-borrowed',
            'pending': 'status-pending'
        }
        return classMap[status] || ''
    }
})