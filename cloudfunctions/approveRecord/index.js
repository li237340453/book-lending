// cloudfunctions/approveRecord/index.js
const cloud = require('wx-server-sdk')
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
}) // 使用当前云环境
const db = cloud.database()

exports.main = async (event, context) => {
    const { recordId, approved } = event // recordId：审批记录ID；approved：bool；

    try {
        // ========== 1. 并发控制核心：原子条件更新（仅当记录为pending状态时才更新） ==========
        // 第一步：更新借阅记录状态（锁定，防止并发）
        const recordUpdateRes = await db.collection('records')
            // .doc(recordId)
            .where({
                _id: recordId,
                status: 'pending', // 关键条件：仅待审批记录可被操作
                // type: 'borrow'
            })
            .update({
                data: {
                    status: approved ? 'approved' : 'rejected', // 同意→approved，拒绝→denied
                    approveTime: db.serverDate(),
                    isRead: true
                }
            })

        // 检查更新是否成功（0行更新=并发冲突：已被他人审批）
        if (recordUpdateRes.stats.updated === 0) {
            return {
                success: false,
                message: '该申请已被其他审批人处理，无需重复操作'
            }
        }

        // 获取记录详情
        const record = await db.collection('records').doc(recordId).get()
        const recordData = record.data

        // 获取借阅人的真实姓名（从users集合查询）
        const userRes = await db.collection('users').where({
            openid: recordData.borrowerOpenid
        }).field({
            realName: true // 只获取realName字段
        }).get()
        const borrowerRealName = userRes.data.length > 0 ? userRes.data[0].realName : recordData.borrowerName

        // ========== 2. 根据审批结果更新图书状态 ==========
        const recordRes = await db.collection('records').doc(recordId).get()
        const targetRecord = recordRes.data
        const bookId = targetRecord.bookId

        if (approved) {
            // 同意：图书改为已借出，绑定借阅人
            await db.collection('books')
                .doc(bookId)
                .update({
                    data: {
                        status: 'borrowed',
                        currentBorrower: targetRecord.borrowerOpenid,
                        currentBorrowerName: borrowerRealName
                    }
                })
        } else {
            // 拒绝：图书恢复为可借阅，解除pending锁定
            await db.collection('books')
                .doc(bookId)
                .update({
                    data: {
                        status: 'available',
                        currentBorrower: db.command.remove(),
                        currentBorrowerName: db.command.remove() // 清除借阅人昵称
                    }
                })
        }

        return {
            success: true,
            message: approved ? '审批通过' : '审批拒绝'
        }

    } catch (err) {
        console.error('审批操作失败', err)
        return {
            success: false,
            message: '服务器错误，审批失败',
            error: err.message
        }
    }
}