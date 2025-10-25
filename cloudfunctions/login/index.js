// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
//这句话是预留的数据库接口
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()

    // 这里假设管理员的openid是固定的，实际应用中可以从数据库读取
    const adminOpenid = 'o6_bmjrPTlm6_2sgVt7hMZOPfL2M' // 替换为实际的管理员openid

    return {
        /***
         *         
        event,
        openid: wxContext.OPENID,
        appid: wxContext.APPID,
        unionid: wxContext.UNIONID,
         */

        openid: wxContext.OPENID,
        isAdmin: wxContext.OPENID === adminOpenid

    }
}