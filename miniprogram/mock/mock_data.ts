import randomName from '../utils/randomName';
import { generateRandomAvatarAndUpload } from '../utils/other';
import api, { request, wrapResp } from '../api/api';
import { GENDER } from '../constants';
import MockData from './data.js';
import { getQualitiesMap } from '../utils/strings';
import axios from 'axios';

async function registerMockUser(id: string, params: Record<string, any>) {
  const res = await request({
    path: '/user/register',
    method: 'POST',
    data: { ...params, },
    headers: {
      'mock-user': id
    }
  });
  return wrapResp(res);
}

function generateRandomUID() {
  return Math.ceil(Math.random() * 1e15).toString().padStart(20, '0');
}

async function createUser(id: string, rid: number) {
  const resp = await registerMockUser(id, {
    avatar_url: await generateRandomAvatarAndUpload(),
    name: randomName.getNickName(),
    sex: GENDER.MALE,
    rid,
    phone_number: '11111111111',
  })
  if (resp.isError) {
    console.error(resp);
    throw Error('failed to register mock user');
  }
  return id;
}

async function createMockCommodity(
  mockUid: string,
  content: string,
  priceFen: number,
  imgUrl: string[],
  quality: number,
  rid: number,
) {
  const resp = wrapResp(await request({
    path: '/commodity/create',
    method: 'POST',
    data: {
      content,
      rid,
      price: priceFen,
      quality: quality,
      img_urls: imgUrl.join(','),
      all_visible: true,
    },
    headers: {
      'mock-user': mockUid
    }
  }));
  if (resp.isError) {
    console.error(resp);
    throw Error('failed to create commodity');
  }
}

async function writeFile(path: string, data: ArrayBuffer) {
  return new Promise<void>((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    fs.writeFile({
      filePath: path,
      data,
      encoding: 'binary',
      success: async (res) => {
        if (!res.errMsg.includes('ok')) {
          reject(res.errMsg);
          return;
        }
        resolve();
      },
      fail(res) {
        reject(res);
      }
    });
  });
}

const users = [
  '00000072353023834507',
  '00000080975900060971',
  '00000082323339944845',
  '00000091461872728381',
  '00000108182270339263',
  '00000269618891616777',
  '00000270395421107676',
  '00000271012403473089',
  '00000275026953913474',
  '00000316652327295306',
  '00000341478489050951',
  '00000382957972259466',
  '00000385621270696860',
  '00000457534671277949',
  '00000521778090944288',
  '00000569074392927707',
  '00000632822659165041',
  '00000645159757566683',
  '00000651649443037795',
  '00000729400810786335',
  '00000768537811983223',
  '00000776133618331741',
  '00000810693528188402',
  '00000846698440159392',
  '00000875027522760850',
  '00000941067165060194',
  '00000942439369768510',
  '00000958000660486036',
  '00000987541435971023',
]

export async function mock() {
  const rids = [
    6, 7, 8, 9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 40, 41, 42, 43, 45,
    46, 47, 48, 49, 50, 51, 19, 20, 21,
    22, 23
  ];
  // {
  //   for (let i = 0; i < rids.length; i++){
  //     const rid = rids[i];
  //     const uid = users[i];
  //     await createUser(uid, rid);
  //   }
  //   return;
  // }
  for (let i = 0; i < MockData.length; i++) {
    const commodity = MockData[i];
    const name = commodity[0] as string;
    const priceYuan = commodity[1] as number;
    const qStr = commodity[3] as string;
    const quality = Object.values(getQualitiesMap())
      .find(q => q.name === qStr);
    if (!quality) {
      throw Error('quality not found');
    }
    const resp = await axios({
      url: `http://localhost:8000/${i}.png`,
      responseType: 'arraybuffer',
    });
    const path = `${wx.env.USER_DATA_PATH}/mock-commodity-${i}.png`;
    await writeFile(path, resp.data);
    const imgResp = await api.uploadImage(path, `commodity/mock-commodity-${i}.png`)
    if (imgResp.isError || !imgResp.data) {
      throw Error('upload image failed');
    }

    let userIndex = Math.floor(i / 3);
    if (!rids[userIndex]) {
      userIndex = 0;
    }
    const uid = users[Math.floor(i / 3)] ?? users[0];
    await createMockCommodity(uid, name, priceYuan * 100, [imgResp.data], quality.value, rids[userIndex]);
  }
}