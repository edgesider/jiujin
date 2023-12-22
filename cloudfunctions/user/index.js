// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')

const db = cloud.database()

const userCollection = db.collection('user')
const commodityCollection = db.collection('commodity')
const transactionCollection = db.collection('transaction')


// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({
    event
  })

  // 获取用户信息
  app.router('getUserInfo', async (ctx, next) => {
    try {
      let { _id } = event.params
      if (!_id) {
        _id = wxContext.OPENID
      }
      const { data } = await userCollection.where({
        _id: _id,
        is_deleted: false
      }).get()
      ctx.body = {data:data?.data?.[0]}
      ctx.body.errno = ctx.body.data ? 0 : -1
    }catch(e){
      ctx.body = {
        error: e?.toString() ?? 'unknown',
        errno: -1
      }
    }
  })

  // 注册
  app.router('registerUser', async (ctx, next) => {
    try {
      res = await cloud.openapi.security.msgSecCheck({
        content: JSON.stringify(event.params)
      })
      const { avatar_url, name, sex, rid } = event.params;
      ctx.body = await userCollection.add({
        data: {
          _id: wxContext.OPENID,
          avatar_url: avatar_url,
          name: name,
          sex: sex,
          rid: rid,
          total_transaction: 0,
          total_release: 0,
          create_time: db.serverDate(),
          update_time: db.serverDate(),
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

  //更新学生信息
  app.router('updateUser', async (ctx, next) => {
    try {
      res = await cloud.openapi.security.msgSecCheck({
        content: JSON.stringify(event.params)
      })
      const { name, rid } = event.params;
      ctx.body = await userCollection.where({
        openid: wxContext.OPENID
      }).update({
        data: {
          name: name,
          rid: rid,
          update_time: db.serverDate()
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1,
      }
      if (e.errCode.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })


  // 学生身份验证, 空方法，默认返回true
  // TODO: 完善学生身份验证
  // app.router('studentIdAuth', async (ctx, next) => {
  //   ctx.body = await userCollection.where({
  //     openid: wxContext.OPENID,
  //     is_deleted: false
  //   }).get().then((res) => {
  //     return true
  //   })
  // })

  return app.serve()
}
