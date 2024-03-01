import { COMMODITY_STATUS_OFF } from "../constants";
import axios from "axios";
import mpAdapter from 'axios-miniprogram-adapter'

const { RespSuccess, RespError } = require('../utils/resp')

const app = getApp();

axios.defaults.adapter = mpAdapter;

const IMAxios = axios.create({
  baseURL: "http://59.110.214.108:8080/",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
  },
});

function getId(){
  return app.globalData.openId;
}

function wrapResp(resp) {
  Object.assign(resp.data, { errno: resp.errCode });
  if (!resp.succeed) {
    return new RespError(resp.data, resp.errMsg ?? 'unknown error', resp.errCode ?? -1);
  }
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
    IMAxios({
      url: param.path,
      method: param.method,
      params: param.data
    }).then((res) => {
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
    return this.getUserInfo(undefined);
  },

  async getOpenId() {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'getOpenId'
      }
    }));
  },

  async getUserInfo(uid) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'getUserInfo',
        params: { _id: uid }
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
    const res = await wx.cloud.callFunction({
      name: 'region',
      data: {
        $url: 'getRegions',
      }
    })
    console.log(JSON.stringify(res.result.data));
    return wrapResponse(res);
  },

  // async getRegions() {
  //   const res = await callFunction({
  //     path: "/region/get",
  //     method: "GET",
  //     data: {}
  //   });
  //   console.log(wrapResp(res));
  //   return wrapResp(res);
  // },

  async registerUser(params) {
    const res = await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'registerUser',
        params
      }
    })
    return wrapResponse(res);
  },

  async updateUser(params) {
    const res = await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'updateUser',
        params
      }
    })
    return wrapResponse(res);
  },
  
  // 获取商品分类信息
  // async getCategory() {
  //   return wrapResponse(await wx.cloud.callFunction({
  //     name: 'category',
  //     data: {
  //       $url: 'getCategory',
  //     }
  //   }))
  // },

  async getCategory() {
    return wrapResp(await callFunction({
      path: "/category/get",
      method: "GET",
      data: {}
    }));
  },

  async getCommodityList(filter) {
    // const { cid, keyword, seller_id, buyer_id, sex, status, start, count } = filter ?? {};
    const res = await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'getCommodityList',
        params: {
          ...filter
        }
      }
    });
    return wrapResponse(res);
  },

  // 获取单个商品
  async getCommodityInfo({ id }) {
    const res = wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'getCommodityList',
        params: {
          _id: id
        }
      }
    }));
    if (res.isError || !res.data[0]) {
      return null
    }
    return new RespSuccess(res.data[0]);
  },

  async createCommodity(commodityInfo) {
    const res = await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'createCommodity',
        params: commodityInfo
      }
    });
    return wrapResponse(res);
  },

  // 擦亮商品
  async polishCommodity({ id }) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'polishCommodity',
        params: { _id: id }
      }
    }));
  },

  async updateCommodity(id, info) {
    Object.assign(info, { _id: id });
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'updateCommodity',
        params: info
      }
    }));
  },

  async offCommodity({ id }) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'updateCommodityStatus',
        params: {
          _id: id,
          status: COMMODITY_STATUS_OFF,
        }
      }
    }));
  },

  async deleteCommodity({ id }) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'deleteCommodity',
        params: {
          _id: id,
        }
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
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'lockCommodity',
        params: {
          _id: id
        },
      }
    }))
  },
  async unlockCommodity(id) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'unlockCommodity',
        params: {
          _id: id
        },
      }
    }))
  },
  async sellCommodity(id, buyer_id) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'sellCommodity',
        params: {
          _id: id,
          buyer_id
        },
      }
    }))
  },

  async getMyViewed(start, count) {
  },
  async getMyBought(start, count) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity',
      data: {
        $url: 'getCommodityList',
        params: {
          buyer_id: getApp().globalData.openId,
          orderBy: 'update_time',
          order: 'desc',
          start, count,
        },
      }
    }));
  },
}

export default api;

export const CommentAPI = {
  async createQuestion(coid, content) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity_question',
      data: {
        $url: 'createQuestion',
        params: {
          cid: coid,
          content
        }
      }
    }));
  },
  async createAnswer(qid, content) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity_answer',
      data: {
        $url: 'createAnswer',
        params: {
          question_id: qid,
          content,
        }
      }
    }));
  },
  async getQuestions(coid, start, count) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity_question',
      data: {
        $url: 'getCommodityQuestions',
        params: {
          cid: coid,
          start, count
        }
      }
    }));
  },
  async getAnswers(qid, start, count) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity_answer',
      data: {
        $url: 'getQuestionAnswers',
        params: {
          question_id: qid,
          start, count
        }
      }
    }));
  },
  async delQuestion(qid) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity_question',
      data: {
        $url: 'deleteQuestion',
        params: {
          question_id: qid,
        }
      }
    }))
  },
  async delAnswer(answer_id) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'commodity_answer',
      data: {
        $url: 'deleteAnswer',
        params: {
          answer_id
        }
      }
    }))
  },
}

/**
 * 收藏相关的API
 */
export const CollectApi = {
  async collect(cid) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'collection',
      data: {
        $url: 'collectCommodity',
        params: { cid },
      }
    }))
  },
  async cancel(cid) {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'collection',
      data: {
        $url: 'cancelCollect',
        params: { cid },
      }
    }))
  },
  async getAll(start, count) {
    const resp = wrapResponse(await wx.cloud.callFunction({
      name: 'collection',
      data: {
        $url: 'getCollection',
        params: {
          start, count
        },
      }
    }))
    if (!resp.isError) {
      const list = []
      for (const item of resp.data.list) {
        list.push(...item.commodityInfoList);
      }
      resp.data = list;
    }
    return resp;
  },
}