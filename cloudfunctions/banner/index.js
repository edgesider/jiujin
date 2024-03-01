// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()
const _ = db.command

const bannerCollection = db.collection('banner')


// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  app.router('getBannerList', async (ctx) => {
    try {
      const { rid } = event.params
      //banner默认是0的话，代表所有rid都可以
      let w = {
        "rid": _.eq(0)
      }
      w["rid"] = w["rid"].or(_.eq(rid))
      ctx.body = await bannerCollection.where(w).orderBy('_id', 'desc').get()
      ctx.body.errno = ctx.body.data ? 0 : -1
    } catch (e) {
      ctx.body = {
        error: e?.toString() ?? 'unknown',
        errno: -1
      }
    }
  })

  return app.serve()
}
