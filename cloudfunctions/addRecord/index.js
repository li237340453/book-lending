// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境
//这句话是预留的数据库接口
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 添加借阅/归还记录
    const recordResult = await db.collection('records').add({
      data: {
        bookId: event.bookId,
        bookName: event.bookName,
        borrowerOpenid: event.borrowerOpenid,
        borrowerName: event.borrowerName,
        type: event.type,
        status: event.type === 'borrow' ? 'pending' : 'approved',
        createTime: db.serverDate(),
        isRead: false
      }
    })

    // 借书逻辑
    if (event.type === 'borrow') {
      await db.collection('books').doc(event.bookId).update({
        data: {
          status: 'pending'
        }
      })
    }
    // 还书逻辑：清除借阅人信息
    else if (event.type === 'return') {
      await db.collection('books').doc(event.bookId).update({
        data: {
          status: 'available',
          currentBorrower: db.command.remove(),
          currentBorrowerName: db.command.remove() // 清除借阅人昵称
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