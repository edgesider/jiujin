import { COMMODITY_STATUS_OFF } from "../constants";

const { RespSuccess, RespError } = require('../utils/resp')
let res = {}

function wrapResponse(resp) {
  if (resp.result.errno !== 0) {
    return new RespError(resp.result);
  }
  return new RespSuccess(resp.result.data);
}

const api = {
  async getSelfInfo() {
    return this.getUserInfo(undefined);
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
    return wrapResponse(res);
  },

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

  // 更新自己的信息，参数是所有字段的子集
  async updateMyInfo(params) {
    res = await wx.cloud.callFunction({
      name: 'user',
      data: {
        $url: 'updateMyInfo',
        params
      }
    })
    if (res.result.errno == -1) {
      console.log("上传用户信息失败！")
      return new RespError("上传失败！")
    } else if (res.result.errno == 87014) {
      console.log("上传信息包含敏感内容！")
      return new RespError("包含敏感内容！")
    } else if (res.result.errno == -2) {
      console.log("有未删除的商品或进行中的交易！")
      return new RespError("有未删除的商品或进行中的交易！")
    } else {
      console.log("上传用户信息成功！")
      return new RespSuccess()
    }
  },

  // 获取商品分类信息
  async getCommodityCategory() {
    res = await wx.cloud.callFunction({
      name: 'category',
      data: {
        $url: 'getCommodityCategory',
      }
    })
    if (res.result.errno == -1) {
      console.log("获取商品分类信息失败！")
      return new RespError("获取商品分类信息失败！")
    }
    const commodityCategory = res.result.data
    console.log({ "获取商品分类信息成功": commodityCategory })
    return new RespSuccess(commodityCategory)

  },

  async getCategory() {
    return wrapResponse(await wx.cloud.callFunction({
      name: 'category',
      data: {
        $url: 'getCategory',
      }
    }))
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
    return wrapResponse(await wx.cloud.callFunction({
      name: 'collection',
      data: {
        $url: 'getCollection',
        params: {
          start, count
        },
      }
    }))
  },
}