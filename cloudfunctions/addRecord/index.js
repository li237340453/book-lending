// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
//这句话是预留的数据库接口
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    //   const wxContext = cloud.getWXContext()

    try {
        // 添加借阅记录
        const recordResult = await db.collection('records').add({
            data: {
                bookId: event.bookId,
                bookName: event.bookName,
                borrowerOpenid: event.borrowerOpenid,
                borrowerName: event.borrowerName,
                type: event.type, // 'borrow' 或 'return'
                status: event.type === 'borrow' ? 'pending' : 'approved', // 借书需要审批，还书直接通过
                createTime: db.serverDate(),
                isRead: false
            }
        })

        // 如果是借书，更新图书状态为已借出
        if (event.type === 'borrow') {
            await db.collection('books').doc(event.bookId).update({
                data: {
                    status: 'borrowed'
                }
            })
        }
        // 如果是还书，更新图书状态为可借阅
        else if (event.type === 'return') {
            await db.collection('books').doc(event.bookId).update({
                data: {
                    status: 'available'
                }
            })
        }

        return {
            success: true,
            recordId: recordResult._id
        }
    } catch (err) {
        console.error(err)
        return {
            success: false,
            error: err.message
        }
    }
}