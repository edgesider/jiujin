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

const RID_MODIFICATION_MIN_DURATION = 1000 * 60 * 60 * 24; // 修改RID的最小时间

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const app = new TcbRouter({ event })

  app.router('getOpenId', async (ctx) => {
    ctx.body = {
      errno: 0,
      data: {
        openId: wxContext.OPENID
      }
    }
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
      ctx.body = { data: data?.[0] }
      ctx.body.errno = ctx.body.data ? 0 : -1
    } catch (e) {
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
          total_selled: 0,
          total_release: 0,
          total_bought: 0,
          total_collect: 0,
          create_time: db.serverDate(),
          update_time: db.serverDate(),
          last_seen_time:db.serverDate(),
          is_deleted: false
        }
      })
      ctx.body.errno = 0
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1
      }
      if (e?.errCode?.toString() === '87014') {
        ctx.body = {
          error: e ?? 'unknown',
          errno: 87014
        }
      }
    }
  })


  app.router('updateUserLastSeenTime', async (ctx, next) => {
    try {
      const res = await userCollection.where({
        _id: wxContext.OPENID,
        is_deleted: false
      }).update({
        data: {
          last_seen_time: db.serverDate()
        }
      })
      ctx.body = { errno: 0 }
    }
    catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1,
      }
      if (e?.errCode?.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  app.router('updateUser', async (ctx, next) => {
    try {
      const { name, rid, avatar_url, sex } = event.params;
      const { data } = await userCollection.where({
        _id: wxContext.OPENID,
        is_deleted: false
      }).get()
      const oldUser = data?.[0];
      if (oldUser == null) {
        ctx.body = { errno: -1, error: 'no such user' };
        ctx.body.errno = -1;
      } else {
        const ridChanged = oldUser.rid !== rid;
        const ridLastModifiedTime = oldUser._rid_modified_time;
        if (ridChanged && ridLastModifiedTime && Date.now() - ridLastModifiedTime.getTime() < RID_MODIFICATION_MIN_DURATION) {
          ctx.body = {
            errno: -2,
            error: 'rid modification too frequent',
          };
          return;
        }
        const res = await userCollection.where({
          _id: wxContext.OPENID
        }).update({
          data: {
            name: name,
            rid: rid,
            avatar_url,
            sex,
            _rid_modified_time: ridChanged ? db.serverDate() : oldUser._rid_modified_time,
            update_time: db.serverDate()
          }
        })
        if (!res?.stats?.updated) {
          ctx.body = {
            errno: -1,
            error: 'no such user'
          }
          return;
        }
        if (ridChanged) {
          // 更新所有商品
          await commodityCollection.where({
            sell_id: wxContext.OPENID,
            rid: oldUser.rid
          }).update({
            data: {
              rid: rid,
            }
          })
        }
        ctx.body = { errno: 0 }
      }
    } catch (e) {
      ctx.body = {
        error: e ?? 'unknown',
        errno: -1,
      }
      if (e?.errCode?.toString() === '87014') {
        ctx.body = {
          errno: 87014
        }
      }
    }
  })

  // 获取用户IM聊天sig
  app.router('genUserSig', async (ctx, next) => {
    const SECRETKEY = 'ac36477ccf70ef504740c61f4db9c304b7c6d021948467633f548d4f40bab4e8';
    const SDKAPPID = 1600027557;
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

  return app.serve()
}
