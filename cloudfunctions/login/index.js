// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境
//这句话是预留的数据库接口
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    // 从users集合查询用户角色
    const userRes = await db.collection('users').where({
      openid: openid
    }).field({
      role: true
    }).get()

    // 默认为借阅人，管理员需在数据库手动设置role为'admin'
    let isAdmin = false
    if (userRes.data.length > 0) {
      isAdmin = userRes.data[0].role === 'admin'
    }

    return {
      openid: openid,
      isAdmin: isAdmin
    }
  } catch (err) {
    console.error('登录查询失败', err)
    return {
      openid: openid,
      isAdmin: false // 出错时默认非管理员
    }
  }
}