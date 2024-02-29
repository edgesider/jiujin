// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const bannerCollection = db.collection('banner')


// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  app.router('getBannerList', async (ctx) => {
    try {
      ctx.body  = await bannerCollection.where({
      }).get()
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
