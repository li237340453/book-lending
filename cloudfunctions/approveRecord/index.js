// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {

    try {
        // 更新记录状态
        await db.collection('records').doc(event.recordId).update({
            data: {
                status: event.approved ? 'approved' : 'rejected',
                isRead: true,
                approveTime: db.serverDate()
            }
        })

        // 如果批准借阅，确保图书状态正确
        if (event.approved) {
            const record = await db.collection('records').doc(event.recordId).get()
            if (record.data.type === 'borrow') {
                await db.collection('books').doc(record.data.bookId).update({
                    data: {
                        status: 'borrowed',
                        currentBorrower: record.data.borrowerOpenid // 记录当前借阅人openid
                    }
                })
            }
        }
        // 如果拒绝借阅，恢复图书状态
        else {
            const record = await db.collection('records').doc(event.recordId).get()
            if (record.data.type === 'borrow') {
                await db.collection('books').doc(record.data.bookId).update({
                    data: {
                        status: 'available',
                        currentBorrower: db.command.remove() // 清除借阅人
                    }
                })
            }
        }

        return {
            success: true
        }
    } catch (err) {
        console.error(err)
        return {
            success: false,
            error: err.message
        }
    }
}