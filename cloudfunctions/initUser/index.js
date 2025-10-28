// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()

    if (userRes.data.length === 0) {
      // 新增用户
      await db.collection('users').add({
        data: {
          openid: openid,
          nickname: event.nickname,
          avatarUrl: event.avatarUrl,
          role: 'borrower', // 默认角色为借阅人
          createTime: db.serverDate()
        }
      })
      return {
        success: true,
        isNewUser: true
      }
    } else {
      // 更新用户信息（如昵称、头像可能已变更）
      await db.collection('users').where({
        openid: openid
      }).update({
        data: {
          nickname: event.nickname,
          avatarUrl: event.avatarUrl,
          lastLoginTime: db.serverDate()
        }
      })
      return {
        success: true,
        isNewUser: false
      }
    }
  } catch (err) {
    console.error('初始化用户失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}