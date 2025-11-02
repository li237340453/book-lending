// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    try {
        // 获取记录详情
        const record = await db.collection('records').doc(event.recordId).get()
        const recordData = record.data

        // 获取借阅人的真实姓名（从users集合查询）
        const userRes = await db.collection('users').where({
            openid: recordData.borrowerOpenid
        }).field({
            realName: true // 只获取realName字段
        }).get()

        const borrowerRealName = userRes.data.length > 0 ? userRes.data[0].realName : recordData.borrowerName

        // 更新记录状态
        await db.collection('records').doc(event.recordId).update({
            data: {
                status: event.approved ? 'approved' : 'rejected',
                isRead: true,
                approveTime: db.serverDate()
            }
        })

        // 如果是批准借阅
        if (event.approved && recordData.type === 'borrow') {
            await db.collection('books').doc(recordData.bookId).update({
                data: {
                    status: 'borrowed',
                    currentBorrower: recordData.borrowerOpenid, // 存储借阅人openid
                    currentBorrowerName: borrowerRealName // 存储真实姓名（优先）或昵称
                }
            })
        }
        // 如果是拒绝借阅
        else if (!event.approved && recordData.type === 'borrow') {
            await db.collection('books').doc(recordData.bookId).update({
                data: {
                    status: 'available',
                    currentBorrower: db.command.remove(),
                    currentBorrowerName: db.command.remove() // 清除借阅人昵称
                }
            })
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