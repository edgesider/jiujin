// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const TcbRouter = require('tcb-router')
const TLSSigAPIv2 = require('./TLSSigAPIv2');

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
      ctx.body = {data:data?.[0]}
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
      const res = await userCollection.where({
        _id: wxContext.OPENID
      }).update({
        data: {
          name: name,
          rid: rid,
          update_time: db.serverDate()
        }
      })
      if (!res?.stats?.updated) {
        throw Error('no such user');
      } else {
        ctx.body = {}
      }
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

  // 获取用户IM聊天sig
  app.router('genUserSig', async (ctx, next) => {
    const SECRETKEY = '0e3f256c7f3e15d4f1d29ea274d8f5e1572a73f4ef2ab9e8d8d7e6c2525f737c';
    const SDKAPPID = 1600012697;
    const EXPIRETIME = 604800;
    try {
      const { id } = event.params;
      var api = new TLSSigAPIv2.Api(SDKAPPID, SECRETKEY);
      var sig = api.genUserSig(id, EXPIRETIME);

      ctx.body = {
        errno: 0,
        data: {
          userSig: sig
        }
      };
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
