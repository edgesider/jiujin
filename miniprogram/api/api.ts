import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import mpAdapter from 'axios-miniprogram-adapter';
import { COMMODITY_STATUS_DEACTIVATED, COMMODITY_STATUS_SELLING } from '../constants';
import { Resp, RespError, RespSuccess } from './resp';
import { cloudProtocolToHttp } from '../utils/other';
import { Platform } from '../lib/openim/index';
import { User } from '../types';

const DEV_BASE_URL = 'http://192.168.1.10:8080';
const version = wx.getAccountInfoSync().miniProgram.envVersion;
let openId: string | undefined;

export function initNetwork() {
  // @ts-ignore
  axios.defaults.adapter = mpAdapter;
  openId = wx.getStorageSync('open_id');
}

export const Axios = axios.create({
  baseURL: (version === 'develop' && DEV_BASE_URL)
    ? DEV_BASE_URL
    : 'https://lllw.cc',
  timeout: 10000,
  headers: {
    'content-type': 'application/json;charset=utf-8',
  },
  validateStatus: () => true,
});

Axios.interceptors.request.use(cfg => {
  cfg.headers['session-key'] = wx.getStorageSync('session_key');
  return cfg;
})

Axios.interceptors.response.use(async resp => {
  if (resp.config.url && !resp.config.url.endsWith('/user/authorize') && resp.status === 401) {
    // @ts-ignore
    resp.config.__authorize_tries__ = (resp.config.__authorize_tries__ ?? 0) + 1
    // @ts-ignore
    if (resp.config.__authorize_tries__ > 10) {
      console.error('登录失败');
      return resp;
    }
    await doAuthorize();
    return Axios(resp.config);
  }
  return resp;
})

async function doAuthorize() {
  const { code } = await wx.login();
  const resp = await api.authorize(code);
  if (resp.isError) {
    throw new Error(`authorize failed: ${JSON.stringify(resp)}`);
  }
  const { open_id, session_key } = resp.data;
  openId = open_id;
  wx.setStorageSync('open_id', open_id);
  wx.setStorageSync('session_key', session_key);
}

export function getOpenId() {
  return openId!;
}

export function wrapResp<T = any>(resp: AxiosResponse): Resp<T> {
  if (resp.status !== 200 || !resp.data?.succeed) {
    const errMsg = resp.data?.err_msg || `${resp.status} ${resp.statusText}`;
    return new RespError(errMsg, resp.data?.err_code ?? -1);
  }
  return new RespSuccess(resp.data?.data);
}

export async function request<T>(param: AxiosRequestConfig & { path: string }) {
  return Axios.request<T>({
    ...param,
    url: param.path,
    method: param.method ?? 'POST',
  });
}

const api = {
  async getSelfInfo(): Promise<Resp<User>> {
    if (!openId) {
      await doAuthorize();
    }
    return this.getUserInfo(getOpenId());
  },
  async authorize(code) {
    return wrapResp(await request({
      path: '/user/authorize',
      method: 'POST',
      data: {
        js_code: code
      }
    }));
  },
  async getUserInfo(uid) {
    return wrapResp(await request({
      path: '/user/getInfo',
      method: 'GET',
      params: {
        id: uid
      }
    }));
  },

  async getOimToken(platform?: Platform, forceUpdate?: boolean) {
    return wrapResp(await request({
      path: '/im/getToken',
      data: {
        platform: platform ?? Platform.Web,
        force_update: Boolean(forceUpdate)
      }
    }));
  },

  async getRegions() {
    return wrapResp(await request({
      path: '/region/get',
      method: 'GET',
      params: {}
    }));
  },

  async registerUser(params) {
    const res = await request({
      path: '/user/register',
      method: 'POST',
      data: {
        ...params,
      }
    });
    return wrapResp(res);
  },

  async updateUser(params) {
    return wrapResp(await request({
      path: '/user/update',
      method: 'POST',
      data: {
        ...params,
      }
    }));
  },

  async createCommodity(commodityInfo) {
    commodityInfo.img_urls = commodityInfo.img_urls.join(',');
    return wrapResp(await request({
      path: '/commodity/create',
      method: 'POST',
      data: {
        ...commodityInfo,
      }
    }));
  },
  async createHelp(helpInfo) {
    helpInfo.img_urls = helpInfo.img_urls.join(',');
    return wrapResp(await request({
      path: '/help/create',
      method: 'POST',
      data: {
        ...helpInfo,
      }
    }));

  },
  // 擦亮商品
  async polishCommodity({ id }) {
    return wrapResp(await request({
      path: '/commodity/polish',
      method: 'POST',
      data: {
        _id: id,
      }
    }));
  },

  // 擦亮商品
  async polishHelp({ id }) {
    return wrapResp(await request({
      path: '/help/polishHelp',
      method: 'POST',
      data: {
        _id: id,
      }
    }));
  },

  async updateCommodity(id, info) {
    Object.assign(info, { _id: id });
    info.img_urls = info.img_urls.join(',');
    return wrapResp(await request({
      path: '/commodity/modify',
      method: 'POST',
      data: {
        ...info,
      }
    }));
  },

  async updateHelp(id, info) {
    Object.assign(info, { _id: id });
    info.img_urls = info.img_urls.join(',');
    return wrapResp(await request({
      path: '/help/modify',
      method: 'POST',
      data: {
        ...info,
      }
    }));
  },

  async activateCommodity({ id }) {
    return wrapResp(await request({
      path: '/commodity/activateCommodity',
      method: 'POST',
      data: {
        _id: id,
        status: COMMODITY_STATUS_SELLING,
      }
    }));
  },

  async deactivateCommodity({ id }) {
    return wrapResp(await request({
      path: '/commodity/deactivateCommodity',
      method: 'POST',
      data: {
        _id: id,
        status: COMMODITY_STATUS_DEACTIVATED,
      }
    }));
  },

  async deactivateHelp({ id }) {
    return wrapResp(await request({
      path: '/help/deactivateHelp',
      method: 'POST',
      data: {
        _id: id,
      }
    }));
  },

  async activateHelp({ id }) {
    return wrapResp(await request({
      path: '/help/activateHelp',
      method: 'POST',
      data: {
        _id: id,
      }
    }));
  },

  async deleteCommodity({ id }) {
    return wrapResp(await request({
      path: '/commodity/delete',
      method: 'POST',
      data: {
        _id: id,
      }
    }));
  },

  async deleteHelp({ id }) {
    return wrapResp(await request({
      path: '/help/delete',
      method: 'POST',
      data: {
        _id: id,
      }
    }));
  },
  /**
   * 上传本地图片到云存储
   * TODO 合规检验
   *
   * @param path 本地路径（如wx.chooseImage得到的临时路径）
   * @param cloudPath 云存储的路径
   * @returns {Promise<Resp>} 上传结果，其中包含云存储中的fileID
   */
  async uploadImage(path: string, cloudPath: string): Promise<Resp<string>> {
    const res = await wx.cloud.uploadFile({
      filePath: path,
      cloudPath: cloudPath,
    });
    if (!res.fileID) {
      return new RespError('upload failed');
    }
    return new RespSuccess(cloudProtocolToHttp(res.fileID));
  },

  async getBannerList(rid) {
    return wrapResp(await request({
      path: 'getBannerList',
      data: { rid },
    }))
  },
  async updateLastSeenTime() {
    return wrapResp(await request({
      path: '/user/updateLastSeenTime'
    }));
  },

  async getPhoneNumber(code) {
    return wrapResp(await request({
      path: '/weixin/phone_number',
      data: { code }
    }));
  },
}

export default api;