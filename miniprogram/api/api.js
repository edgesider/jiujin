import { COMMODITY_STATUS_OFF } from "../constants";
import axios from "axios";
import mpAdapter from 'axios-miniprogram-adapter'

const { RespSuccess, RespError } = require('./resp')

axios.defaults.adapter = mpAdapter;

export const Axios = axios.create({
  // baseURL: "http://localhost:8080/",
  baseURL: "https://lllw.ykai.cc",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
  validateStatus: () => true,
});

Axios.interceptors.request.use(cfg => {
  cfg.headers['session-key'] = wx.getStorageSync('session_key');
  return cfg;
})

Axios.interceptors.response.use(async resp => {
  if (!resp.config.url.endsWith('/user/authorize') && resp.status === 401) {
    resp.config.__authorize_tries__ = (resp.config.__authorize_tries__ ?? 0) + 1
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

let openId = wx.getStorageSync('open_id');

export function getOpenId() {
  return openId;
}

function wrapResp(resp) {
  if (resp.status !== 200 || !resp.data.succeed) {
    return new RespError(resp.data, `${resp.status} ${resp.statusText}`, resp.data.errCode ?? -1);
  }
  return new RespSuccess(resp.data?.data);
}

function wrapResponse(resp) {
  if (resp.result?.errno !== 0) {
    return new RespError(resp.result, resp.result?.error ?? 'unknown error', resp.result?.errno ?? -1);
  }
  return new RespSuccess(resp.result.data);
}

async function request(param) {
  return Axios({
    url: param.path,
    method: param.method ?? 'POST',
    params: param.params,
    data: param.data,
  });
}

const api = {
  async getSelfInfo() {
    if (!openId) {
      await doAuthorize();
    }
    return this.getUserInfo(getOpenId());
  },
  async authorize(code) {
    return wrapResp(await request({
      path: "/user/authorize",
      method: "POST",
      data: {
        js_code: code
      }
    }));
  },
  async getUserInfo(uid) {
    return wrapResp(await request({
      path: "/user/getInfo",
      method: "GET",
      params: {
        id: uid
      }
    }));
  },

  async genUserSig(id) {
    const res = await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'genUserSig',
        params: { id }
      }
    });
    return wrapResponse(res);
  },

  async getRegions() {
    return wrapResp(await request({
      path: "/region/get",
      method: "GET",
      params: {}
    }));
  },

  async getAccessToken() {
    const res = await request({
      path: "/getAccessToken",
      method: "GET",
      params: {}
    });
    return wrapResp(res);
  },

  async registerUser(params) {
    const res = await request({
      path: "/user/register",
      method: "POST",
      data: {
        ...params,
        openid: getOpenId()
      }
    });
    return wrapResp(res);
  },

  async updateUser(params) {
    return wrapResp(await request({
      path: "/user/update",
      method: "POST",
      data: {
        ...params,
        openid: getOpenId()
      }
    }));
  },

  async getCategory() {
    return wrapResp(await request({
      path: "/category/get",
      method: "GET",
      params: {}
    }));
  },

  async getCommodityList(filter) {
    const resp = await request({
      path: "/commodity/getList",
      method: "POST",
      data: {
        ...filter,
        openid: getOpenId()
      }
    });
    if (!resp.data) resp.data = [];
    const res = wrapResp(resp);
    res.data.forEach(c => {
      c.img_urls = c.img_urls
        .replaceAll("\"", "")
        .replaceAll(" ", "")
        .split(",");
    })
    return res;
  },

  // 获取单个商品
  async getCommodityInfo({ id }) {
    const listResp = await this.getCommodityList({ _id: id });
    if (!listResp.isError) {
      listResp.data = listResp.data?.[0] ?? null;
    }
    return listResp;
  },

  async createCommodity(commodityInfo) {
    commodityInfo.img_urls = commodityInfo.img_urls.join(',');
    return wrapResp(await request({
      path: "/commodity/create",
      method: "POST",
      data: {
        ...commodityInfo,
        openid: getOpenId()
      }
    }));
  },

  // 擦亮商品
  async polishCommodity({ id }) {
    return wrapResp(await request({
      path: "/commodity/polish",
      method: "POST",
      data: {
        _id: id,
        openid: getOpenId()
      }
    }));
  },

  async updateCommodity(id, info) {
    Object.assign(info, { _id: id });
    info.img_urls = info.img_urls.join(',');
    return wrapResp(await request({
      path: "/commodity/modify",
      method: "POST",
      data: {
        ...info,
        openid: getOpenId()
      }
    }));
  },

  async offCommodity({ id }) {
    return wrapResp(await request({
      path: "/commodity/updateStatus",
      method: "POST",
      data: {
        _id: id,
        status: COMMODITY_STATUS_OFF,
        openid: getOpenId()
      }
    }));
  },

  async deleteCommodity({ id }) {
    return wrapResp(await request({
      path: "/commodity/delete",
      method: "POST",
      data: {
        _id: id,
        openid: getOpenId()
      }
    }));
  },

  /**
   * 上传本地图片到云存储
   * TODO 压缩上传
   * TODO 合规检验
   *
   * @param path 本地路径（如wx.chooseImage得到的临时路径）
   * @param cloudPath 云存储的路径
   * @returns {Promise<Resp>} 上传结果，其中包含云存储中的fileID
   */
  async uploadImage(path, cloudPath) {
    const res = await wx.cloud.uploadFile({
      filePath: path,
      cloudPath: cloudPath,
    });
    if (!res.fileID) {
      return new RespError(res, 'upload failed');
    }
    return new RespSuccess(res.fileID);
  },

  async lockCommodity(id) {
    return wrapResp(await request({
      path: "/commodity/lock",
      method: "POST",
      data: {
        _id: id
      }
    }));
  },

  async unlockCommodity(id) {
    return wrapResp(await request({
      path: "/commodity/unlock",
      method: "POST",
      data: {
        _id: id
      }
    }));
  },

  async sellCommodity(id, buyer_id) {
    return wrapResp(await request({
      path: "/commodity/sell",
      method: "POST",
      data: {
        _id: id,
        buyer_id,
        openid: getOpenId()
      }
    }));
  },

  async getViewed(start, count) {
    return wrapResp(await request({
      path: "/commodity/getViewed",
      method: "POST",
      data: {
        start, count,
        openid: getOpenId()
      }
    }));
  },

  async setViewed(cid) {
  },
  async getMyViewed(start, count) {
  },
  async getBannerList(rid) {
    return wrapResp(await request({
      path: 'getBannerList',
      data: { rid },
    }))
  },
  async updateLastSeenTime() {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'updateUserLastSeenTime',
      }
    }));
  },
}

export default api;

export const CommentAPI = {
  async createQuestion(coid, content) {
    return wrapResp(await request({
      path: "/createQuestion",
      method: "POST",
      data: {
        cid: coid,
        content,
        openid: getOpenId()
      }
    }));
  },

  async createAnswer(cid, qid, content) {
    return wrapResp(await request({
      path: "/createAnswer",
      method: "POST",
      data: {
        cid,
        question_id: qid,
        content,
        openid: getOpenId()
      }
    }));
  },

  async getCommodityQuestionsAndAnswers(coid, start, count) {
    return wrapResp(await request({
      path: "/getCommodityQuestionsAndAnswers",
      method: "POST",
      data: {
        commodity_id: coid,
        start, count,
        openid: getOpenId()
      }
    }));
  },
  async getQuestions(coid, start, count) {
    var res = await request({
      path: "/getCommodityQuestionsAndAnswers",
      method: "POST",
      data: {
        commodity_id: coid,
        start, count,
        openid: getOpenId()
      }
    });
    res.data = res.data.commodityQuestions;
    return wrapResp(res);
  },
  async getAnswers(qid, start, count) {
    var res = await request({
      path: "/getCommodityQuestionsAndAnswers",
      method: "POST",
      data: {
        commodity_id: coid,
        start, count,
        openid: getOpenId()
      }
    });
    res.data = res.data.commodityAnswers;
    return wrapResp(res);
  },

  async delQuestion(qid) {
    return wrapResp(await request({
      path: "/deleteQuestion",
      method: "POST",
      data: {
        question_id: qid,
        openid: getOpenId()
      }
    }));
  },
  async delAnswer(answer_id) {
    return wrapResp(await request({
      path: "/deleteAnswer",
      method: "POST",
      data: {
        answer_id,
        openid: getOpenId()
      }
    }));
  },
  async modifyQuestion(question_id, content) {
    return wrapResp(await request({
      path: "/modifyQuestion",
      method: "POST",
      data: {
        question_id,
        content,
        openid: getOpenId()
      }
    }));
  },
  async modifyAnswer(answer_id, content) {
    return wrapResp(await request({
      path: "/modifyAnswer",
      method: "POST",
      data: {
        answer_id,
        content,
        openid: getOpenId()
      }
    }));
  },
}

/**
 * 收藏相关的API
 */
export const CollectApi = {
  async collect(cid) {
    return wrapResp(await request({
      path: "/collect/commodity",
      method: "POST",
      data: {
        cid,
        openid: getOpenId()
      }
    }));
  },
  async cancel(cid) {
    return wrapResp(await request({
      path: "/collect/cancel",
      method: "POST",
      data: {
        cid,
        openid: getOpenId()
      }
    }));
  },
  async getAll(start, count) {
    const resp = wrapResp(await request({
      path: "/collect/getInfo",
      method: "POST",
      data: {
        start,
        count,
        openid: getOpenId()
      }
    }));
    resp.data?.forEach(c => {
      c.img_urls = c.img_urls
        .replaceAll("\"", "")
        .replaceAll(" ", "")
        .split(",");
    })
    return resp;
  },
}