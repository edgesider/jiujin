// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const commodityQuestionCollection = db.collection('commodity_question')

const MAX_LIMIT = 50

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  app.router('createQuestion', async (ctx, next) => {
    const { cid, content } = event.params
    try {
      ctx.body = await commodityQuestionCollection.add({
        data: {
          cid: cid,
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
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 通过商品_id获取商品提问
  app.router('getCommodityQuestions', async (ctx, next) => {
    const { cid, start, count } = event.params
    try {
      ctx.body = await commodityQuestionCollection.aggregate()
        .match({
          cid: cid,
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
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        errno: -1
      }
    }
  })

  app.router('modifyQuestion', async (ctx, next) => {
    const { question_id, content } = event.params
    try {
      ctx.body = await commodityQuestionCollection.where({
        question_id: question_id,
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

  app.router('deleteQuestion', async (ctx, next) => {
    const { question_id } = event.params
    try {
      ctx.body = await commodityQuestionCollection.where({
        question_id: question_id,
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