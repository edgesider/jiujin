import { COMMODITY_STATUS_OFF } from "../constants";
import axios from "axios";
import mpAdapter from 'axios-miniprogram-adapter'

const { RespSuccess, RespError } = require('../utils/resp')

axios.defaults.adapter = mpAdapter;

const IMAxios = axios.create({
  baseURL: "http://59.110.214.108:8080/",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

function getId(){
  return getApp().globalData.openId;
}

function wrapResp(resp) {
  if (!resp.data) resp.data = {};
  if (!resp.succeed) {
    Object.assign(resp.data, { errno: resp.errCode });
    return new RespError(resp.data, resp.errMsg ?? 'unknown error', resp.errCode ?? -1);
  }
  Object.assign(resp.data, { errno: 0 });
  return new RespSuccess(resp.data);
}

function wrapResponse(resp) {
  if (resp.result?.errno !== 0) {
    return new RespError(resp.result, resp.result?.error ?? 'unknown error', resp.result?.errno ?? -1);
  }
  return new RespSuccess(resp.result.data);
}

async function callFunction(param){
  return new Promise(function(resolve, reject) {
    var req = {
      url: param.path,
      method: param.method,
      params: param.params,
      data: param.data,
    };
    IMAxios(req).then((res) => {
      if (res.status >= 400){
        reject({ errCode: -1, errMsg: `${res.status} ${res.statusText}` });
        return;
      }
      resolve(res.data);
    }).catch((error) => {
      reject({ errCode: -1, errMsg: error });
    });
  });
}

const api = {
  async getSelfInfo() {
    return this.getUserInfo(getId());
  },
  async getOpenId() {
    return getId();
  },
  async userLogin(code) {
    const res = wrapResp(await callFunction({
      path: "/login",
      method: "POST",
      data: {
        code
      }
    }));
    return res;
  },
  async getUserInfo(uid) {
    const res = wrapResp(await callFunction({
      path: "/user/getInfo",
      method: "GET",
      params: {
        Id: uid
      }
    }));
    return res;
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
    return wrapResp(await callFunction({
      path: "/region/get",
      method: "GET",
      params: {}
    }));
  },

  // async getRegions() { 
  //   const res = await wx.cloud.callFunction({ 
  //     name: 'region', 
  //     data: {
  //       $url: 'getRegions', 
  //     } 
  //   }) 
  //   return wrapResponse(res);
  // },

  async getAccessToken() {
    const res = await callFunction({
      path: "/getAccessToken",
      method: "GET",
      params: {}
    });
    return wrapResp(res);
  },

  async registerUser(params) {
    const res = await callFunction({
      path: "/user/register",
      method: "POST",
      data: {
        ...params,
        openid: getId()
      }
    });
    return wrapResp(res);
  },

  async updateUser(params) {
    return wrapResp(await callFunction({
      path: "/user/update",
      method: "POST",
      data: {
        ...params,
        openid: getId()
      }
    }));
  },

  async getCategory() {
    return wrapResp(await callFunction({
      path: "/category/get",
      method: "GET",
      params: {}
    }));
  },

  async getCommodityList(filter) {
    const resp = await callFunction({
      path: "/commodity/getList",
      method: "POST",
      data: {
        ...filter,
        openid: getId()
      }
    });
    if (!resp.data) resp.data = [];
    const res = wrapResp(resp);
    for (var i = 0; i < res.data.length; i++){
      res.data[i].img_urls = res.data[i].img_urls
        .replaceAll("\"", "")
        .replaceAll(" ", "")
        .split(",");
      res.data[i].sell_id = res.data[i].seller_id;
    }
    return res;
  },

  // 获取单个商品
  async getCommodityInfo({ id }) {
    const resp = await callFunction({
      path: "/commodity/getList",
      method: "POST",
      data: {
        _id: id,
        openid: getId()
      }
    });
    if (!resp.data){
      return new RespError({}, 'commodity not found');
    }
    const res = wrapResp(resp);
    Object.assign(res, { data: res.data.collectCommodity });
    Object.assign(res.data, { sell_id: res.data.seller_id });
    res.data.img_urls = res.data.img_urls
        .replaceAll("\"", "")
        .replaceAll(" ", "")
        .split(",");
    return res;
  },

  async createCommodity(commodityInfo) {
    commodityInfo.img_urls = commodityInfo.img_urls.join(',');
    return wrapResp(await callFunction({
      path: "/commodity/create",
      method: "POST",
      data: {
        ...commodityInfo,
        openid: getId()
      }
    }));
  },

  // 擦亮商品
  async polishCommodity({ id }) {
    return wrapResp(await callFunction({
      path: "/commodity/polish",
      method: "POST",
      data: {
        _id: id,
        openid: getId()
      }
    }));
  },

  async updateCommodity(id, info) {
    Object.assign(info, { _id: id });
    return wrapResp(await callFunction({
      path: "/commodity/modify",
      method: "POST",
      data: {
        ...info,
        openid: getId()
      }
    }));
  },

  async offCommodity({ id }) {
    return wrapResp(await callFunction({
      path: "/commodity/updateStatus",
      method: "POST",
      data: {
        _id: id,
        status: COMMODITY_STATUS_OFF,
        openid: getId()
      }
    }));
  },

  async deleteCommodity({ id }) {
    return wrapResp(await callFunction({
      path: "/commodity/delete",
      method: "POST",
      data: {
        _id: id,
        openid: getId()
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
    return wrapResp(await callFunction({
      path: "/commodity/lock",
      method: "POST",
      data: {
        _id: id
      }
    }));
  },

  async unlockCommodity(id) {
    return wrapResp(await callFunction({
      path: "/commodity/unlock",
      method: "POST",
      data: {
        _id: id
      }
    }));
  },

  async sellCommodity(id, buyer_id) {
    return wrapResp(await callFunction({
      path: "/commodity/sell",
      method: "POST",
      data: {
        _id: id,
        buyer_id,
        openid: getId()
      }
    }));
  },

  async getViewed(start, count) {
    return wrapResp(await callFunction({
      path: "/commodity/getViewed",
      method: "POST",
      data: {
        start, count,
        openid: getId()
      }
    }));
  },

  async setViewed(cid) {
  },
  async getMyViewed(start, count) {
  },
  async getBannerList(rid) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'banner',
      data: {
        $url: 'getBannerList',
        params: { rid }
      }
    }));
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
    return wrapResp(await callFunction({
      path: "/createQuestion",
      method: "POST",
      data: {
        cid: coid,
        content,
        openid: getId()
      }
    }));
  },

  async createAnswer(cid, qid, content) {
    return wrapResp(await callFunction({
      path: "/createAnswer",
      method: "POST",
      data: {
        cid,
        question_id: qid,
        content,
        openid: getId()
      }
    }));
  },

  async getCommodityQuestionsAndAnswers(coid, start, count){
    return wrapResp(await callFunction({
      path: "/getCommodityQuestionsAndAnswers",
      method: "POST",
      data: {
        commodity_id: coid,
        start, count,
        openid: getId()
      }
    }));
  },
  async getQuestions(coid, start, count) {
    var res = await callFunction({
      path: "/getCommodityQuestionsAndAnswers",
      method: "POST",
      data: {
        commodity_id: coid,
        start, count,
        openid: getId()
      }
    });
    res.data = res.data.commodityQuestions;
    return wrapResp(res);
  },
  async getAnswers(qid, start, count) {
    var res = await callFunction({
      path: "/getCommodityQuestionsAndAnswers",
      method: "POST",
      data: {
        commodity_id: coid,
        start, count,
        openid: getId()
      }
    });
    res.data = res.data.commodityAnswers;
    return wrapResp(res);
  },

  async delQuestion(qid) {
    return wrapResp(await callFunction({
      path: "/deleteQuestion",
      method: "POST",
      data: {
        question_id: qid,
        openid: getId()
      }
    }));
  },
  async delAnswer(answer_id) {
    return wrapResp(await callFunction({
      path: "/deleteAnswer",
      method: "POST",
      data: {
        answer_id,
        openid: getId()
      }
    }));
  },
  async modifyQuestion(question_id, content){
    return wrapResp(await callFunction({
      path: "/modifyQuestion",
      method: "POST",
      data: {
        question_id,
        content,
        openid: getId()
      }
    }));
  },
  async modifyAnswer(answer_id, content){
    return wrapResp(await callFunction({
      path: "/modifyAnswer",
      method: "POST",
      data: {
        answer_id,
        content,
        openid: getId()
      }
    }));
  },
}

/**
 * 收藏相关的API
 */
export const CollectApi = {
  async collect(cid) {
    return wrapResp(await callFunction({
      path: "/collect/commodity",
      method: "POST",
      data: {
        cid,
        openid: getId()
      }
    }));
  },
  async cancel(cid) {
    return wrapResp(await callFunction({
      path: "/collect/cancel",
      method: "POST",
      data: {
        cid,
        openid: getId()
      }
    }));
  },
  async getAll(start, count) {
    const resp = await callFunction({
      path: "/collect/getInfo",
      method: "POST",
      data: {
        start,
        count,
        openid: getId()
      }
    });
    if (!resp.data) resp.data = [];
    const res = wrapResp(resp);
    for (var i = 0; i < res.data.length; i++){
      res.data[i].img_urls = res.data[i].img_urls
        .replaceAll("\"", "")
        .replaceAll(" ", "")
        .split(",");
      res.data[i].sell_id = res.data[i].seller_id;
    }
    return res;
  },
}