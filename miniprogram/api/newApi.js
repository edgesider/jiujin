import { COMMODITY_STATUS_OFF } from "../constants";
import axios from "axios";

const { RespSuccess, RespError } = require('../utils/resp')

const app = getApp();

const IMAxios = axios.create({
  baseURL: "http://59.110.214.108:8080/",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
  },
});

function getId(){
  //return app.globalData.openId;
  return "1";
}

function wrapResp(resp) {
  if (!resp.succeed) {
    return new RespError(resp, resp.errMsg ?? 'unknown error', resp.errCode ?? -1);
  }
  return new RespSuccess(resp);
}

function wrapResponse(resp) {
  if (resp.result?.errno !== 0) {
    return new RespError(resp.result, resp.result?.error ?? 'unknown error', resp.result?.errno ?? -1);
  }
  return new RespSuccess(resp.result.data);
}

async function callFunction(param){
  return new Promise(function(resolve, reject) {
    IMAxios({
      url: param.path,
      method: param.method,
      data: param.data
    }).then((res) => {
      if (res.status >= 400){
        reject({ errCode: -1, errMsg: res.status });
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

  async getUserInfo(uid) {
    return wrapResp(await callFunction({
      path: "/user/getInfo",
      method: "GET",
      data: {
        Id: uid
      }
    }));
  },

  async genUserSig(id) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'genUserSig',
        params: { id }
      }
    }));
  },

  async getRegions() {
    return wrapResp(await callFunction({
      path: "/region/get",
      method: "GET",
      data: {}
    }));
  },

  async getAccessToken() {
    return wrapResp(await callFunction({
      path: "/getAccessToken",
      method: "GET",
      data: {}
    }));
  },

  async registerUser(params) {
    const res = await callFunction({
      path: "/user/register",
      method: "POST",
      data: {
        ...params,
        open_id: getId()
      }
    });
    return wrapResp(res);
  },

  // name rid avatar_url sex openid
  async updateUser(params) {
    return wrapResp(await callFunction({
      path: "/user/update",
      method: "POST",
      data: {
        ...params
      }
    }));
  },
// 获取商品分类信息
  async getCategory() {
    return wrapResp(await callFunction({
      path: "/category/get",
      method: "GET",
      data: {}
    }));
  },

  async getCommodityList(filter) {
    return wrapResp(await callFunction({
      path: "/commodity/getList",
      method: "POST",
      data: {
        ...filter,
        openid: getId()
      }
    }));
  },

  // 获取单个商品
  async getCommodityInfo({ id }) {
    return wrapResp(await callFunction({
      path: "/commodity/getList",
      method: "POST",
      data: {
        _id: id,
        openid: getId()
      }
    }));
  },

  async createCommodity(commodityInfo) {
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
  async createAnswer(qid, content) {
    return wrapResp(await callFunction({
      path: "/createAnswer",
      method: "POST",
      data: {
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
    return wrapResp(await callFunction({
      path: "/collect/getInfo",
      method: "GET",
      data: {
        start,
        count,
        openid: getId()
      }
    }));
  },
}