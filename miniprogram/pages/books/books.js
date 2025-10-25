// pages/books/books.js

const app = getApp()
const db = wx.cloud.database()

Page({
    data: {
        books: [],
        searchKey: '',
        openid: null
    },
    onLoad() {
        this.setData({
            openid: app.globalData.openid
        })
        this.getBooks()
    },
    onShow() {
        this.getBooks()
    },
    getBooks() {
        wx.showLoading({
            title: '加载中...'
        })

        db.collection('books').get().then(res => {
            // console.log(res)
            wx.hideLoading()
            this.setData({
                books: res.data
            })
        }).catch(err => {
            wx.hideLoading()
            console.error('获取图书失败', err)
            wx.showToast({
                title: '获取图书失败',
                icon: 'none'
            })
        })
    },
    onSearchInput(e) {
        this.setData({
            searchKey: e.detail.value
        })
        // 可以在这里实现搜索过滤逻辑
    },
    handleBorrow(e) {
        const bookId = e.currentTarget.dataset.id
        const bookName = e.currentTarget.dataset.name

        wx.showModal({
            title: '确认借阅',
            content: `确定要借阅《${bookName}》吗？`,
            success: res => {
                if (res.confirm) {
                    this.addRecord(bookId, bookName, 'borrow')
                }
            }
        })
    },
    handleReturn(e) {
        const bookId = e.currentTarget.dataset.id
        const bookName = e.currentTarget.dataset.name

        wx.showModal({
            title: '确认归还',
            content: `确定要归还《${bookName}》吗？`,
            success: res => {
                if (res.confirm) {
                    this.addRecord(bookId, bookName, 'return')
                }
            }
        })
    },
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
                        title: type === 'borrow' ? '借阅申请已提交，请等待审批' : '归还成功',
                        icon: 'success'
                    })
                    this.getBooks()
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
    }
})