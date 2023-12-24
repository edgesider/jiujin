// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const MAX_LIMIT = 50

const commodityAnswerCollection = db.collection('commodity_answer')
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  app.router('createAnswer', async (ctx, next) => {
    const { question_id, content } = event.params
    try {
      ctx.body = await commodityAnswerCollection.add({
        data: {
          question_id: question_id,
          content: content,
          user_id: wxContext.OPENID,
          create_time: db.serverDate(),
          update_time: db.serverDate(),
          is_deleted: false
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        errno: -1
      }
      if ((e.errCode && e.errCode.toString()) === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 通过提问_id获取问题回答
  app.router('getQuestionAnswers', async (ctx, next) => {
    const { question_id, start, count } = event.params

    try {
      const { list } = await commodityAnswerCollection.aggregate()
        .match({
          question_id,
          is_deleted: false
        })
        .project({
          update_time: false,
          is_deleted: false
        })
        .lookup({
          from: 'user',
          localField: 'user_id',
          foreignField: '_id',
          as: 'userInfoList'
        })
        .sort({
          update: -1
        })
        .skip(start)
        .limit(count)
        .end()
      ctx.body = {
        data: list,
        errno: 0
      }
    } catch (e) {
      ctx.body = {
        errno: -1
      }
    }
  })

  app.router('modifyAnswer', async (ctx, next) => {
    const { answer_id, content } = event.params
    try {
      ctx.body = await commodityAnswerCollection.where({
        answer_id: answer_id,
        openid: wxContext.OPENID
      }).update({
        data: {
          content: content,
          update_time: db.serverDate()
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        errno: -1
      }
    }
  })

  app.router('deleteAnswer', async (ctx, next) => {
    const { answer_id } = event.params
    try {
      ctx.body = await commodityAnswerCollection.where({
        answer_id: answer_id,
        openid: wxContext.OPENID
      }).update({
        data: {
          is_deleted: true
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        errno: -1
      }
    }
  })

  return app.serve()
}