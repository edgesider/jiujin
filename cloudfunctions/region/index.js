// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

const regionCollection = db.collection('region')
const TcbRouter = require('tcb-router')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  // 获取所有区域信息
  app.outer('getRegions', async (ctx, next) => {
    try{
      ctx.body = await regionCollection.get()
      ctx.body.errno = 0
    }catch(e){
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1
      }
    }
  })

  // 获取所有主页区域信息
  app.outer('getHomeRegions', async (ctx, next) => {
    try{
      // rid = await userCollection.where({
      //   openid: wxContext.OPENID,
      //   is_deleted: false
      // })
      // .field({
      //   rid: true,
      // })
      // .get()
      rid =1
      regions = await regionCollection.get()


      //TODO
      ctx.body.errno = 0
    }catch(e){
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1
      }
    }
  })
  return app.serve()
}