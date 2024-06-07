import axios from 'axios';
import { OpenIMSDK, Platform } from '../miniprogram/lib/openim';
import ws from 'ws';
import assert from 'node:assert';

// @ts-ignore
global.WebSocket = ws;

interface OimResult<T> {
  errCode: number;
  errMsg?: string;
  data?: T;
}

let token = '';

async function oimReq<T>(
  endpoint: string,
  data: Record<string, any>,
  withToken = true
): Promise<OimResult<T>> {
  if (withToken && !token) {
    const t = await getUserToken('imAdmin', Platform.Web);
    if (!t) {
      return {
        errCode: -1,
        errMsg: 'failed to get token'
      };
    }
    token = t;
  }
  const resp = await axios(
    `https://im.lllw.cc/api/${endpoint}`,
    {
      method: 'POST',
      headers: {
        operationID: Date.now().toString(),
        token,
      },
      data: {
        ...data,
        secret: 'imlllwim',
      },
    });
  return {
    errCode: resp.data?.errCode ?? -1,
    errMsg: resp.data?.errMsg ?? 'Unknown error',
    data: resp.data?.data
  };
}

async function getUserToken(userID: string, platformID: Platform): Promise<string | null> {
  const resp = await oimReq<{ expireTimeSeconds: number, token: string }>(
    '/auth/user_token',
    {
      userID,
      platformID,
    },
    false)
  return resp.data?.token ?? null;
}

async function createUser(userId: string, nickname: string): Promise<boolean> {
  const res = await oimReq('/user/user_register', {
    users: [
      {
        userID: userId,
        nickname,
        faceURL: '',
      }
    ]
  });
  return res.errCode === 0;
}

async function main() {
  // for (let i = 0; i < 100; i++) {
  //   const id = `TestUser-${i}`;
  //   if (await createUser(id, id)) {
  //     console.log(`已创建用户 ${id}`);
  //   } else {
  //     console.error(`创建用户失败 ${id}`);
  //     process.exit(-1);
  //   }
  // }
  const user = `TestUser-0`;
  const token = await getUserToken(user, Platform.Web);
  if (!token) {
    throw Error('failed to get token')
  }
  const oim = new OpenIMSDK()
  const res = await oim.login({
    userID: user,
    token,
    wsAddr: 'wss://im.lllw.cc/ws/',
    apiAddr: 'https://im.lllw.cc/api/',
    platformID: Platform.Web,
  })
  assert(res.errCode === 0);
  console.warn('logged in');
  {
    const res = await oim.getAllConversationList();
    console.log(res);
  }
}

main().then().catch(console.error);