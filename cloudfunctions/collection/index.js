// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const collectionCollection = db.collection('collection')
const commodityCollection = db.collection('commodity')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  app.router('collectCommodity', async (ctx, next) => {
    try {
      const { cid } = event.params;
      const countResult = await commodityCollection.where({
        is_deleted: false,
        _id: cid
      }).count()
      if (countResult.total === 0) {
        ctx.body = {
          errno: -1,
          error: '商品不存在'
        }
        return
      }
      ctx.body = await collectionCollection.add({
        data: {
          _id: wxContext.OPENID,
          cid: cid,
          is_deleted: false
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          error: e ?? 'unknown',
          errno: 87014
        }
      }
    }
  })

  app.router('cancelCollect', async (ctx, next) => {
    try {
      const { cid } = event.params;
      ctx.body = await collectionCollection.where({
        data: {
          _id: wxContext.OPENID,
          cid: cid,
        }
      }).update({
        data: {
          is_deleted: true
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          error: e ?? 'unknown',
          errno: 87014
        }
      }
    }
  })

  app.router('getCollection', async (ctx, next) => {
    try {
      ctx.body = await collectionCollection.aggregate()
        .match({
          _id: wxContext.OPENID,
          is_deleted: false
        })
        .lookup({
          from: 'commodity',
          localField: 'cid',
          foreignField: '_id',
          as: 'commodityInfoList'
        })
        .end()
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        errno: -1
      }
    }
  })
  return app.serve()
}