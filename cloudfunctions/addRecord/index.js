// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境
//这句话是预留的数据库接口
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  
  const wxContext = cloud.getWXContext()

  try {
    // ========== 1. 借阅操作：需要并发校验 ==========
    if (event.type === 'borrow') {
      // 原子操作：仅当图书状态为available时，才能改为pending
      const bookUpdateRes = await db.collection('books')
        .where({                   // 条件：只有可借阅状态才能发起申请
          _id: event.bookId,       // 指定图书ID
          status: 'available'      // 条件：仅可借阅状态
        })
        .update({
          data: { status: 'pending' } // 锁定为待审批
        })
      
      // 检查更新是否成功（0行更新=并发冲突）
      if (bookUpdateRes.stats.updated === 0) {
        return { 
          success: false, 
          message: '该图书已被他人发起借阅申请，请稍后再试' 
        }
      }
      
      // 添加借阅记录
      await db.collection('records').add({
        data: {
          bookId: event.bookId,
          bookName: event.bookName,
          borrowerOpenid: event.borrowerOpenid,
          borrowerName: event.borrowerName,
          type: 'borrow',
          status: 'pending', // 待审批
          isRead: false,
          createTime: db.serverDate()
        }
      })
    
    // ========== 2. 归还操作：无需校验，直接执行 ==========
    } else if (event.type === 'return') {
      // 归还时直接更新图书状态为可借阅（无需审批）
      await db.collection('books').doc(event.bookId).update({
        data: {
          status: 'available',
          currentBorrower: _.remove(),
          currentBorrowerName: _.remove()
        }
      })
      
      // 添加归还记录
      await db.collection('records').add({
        data: {
          bookId: event.bookId,
          bookName: event.bookName,
          borrowerOpenid: event.borrowerOpenid,
          borrowerName: event.borrowerName,
          type: 'return',
          status: 'completed', // 归还记录直接标记为完成
          isRead: true,
          createTime: db.serverDate()
        }
      })
    }
    
    return { success: true }
    
  } catch (err) {
    console.error('添加记录失败', err)
    return { 
      success: false, 
      message: '服务器错误，请重试',
      error: err.message 
    }
  }
}