// miniprogram/pages/commodity_release/commodity_release.js

const app = getApp()
const api = require('../../api/api')
const cache = require("../../cache/cache")
const rules = require('../../utils/rules')
const { RespSuccess, RespError } = require('../../utils/resp')
const { sleep } = require('../../utils/time');
const { getQualitiesMap, getQualityName } = require('../../utils/strings');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    thumbnail: [],
    commodityImg: [],
    commodityNumber: 1,
    columns: [],
    categoryIndex: 0,
    categories: [
      { _id: 0, name: '其他' }
    ],
    commodityTitle: "",
    commodityContent: "",
    commodityPurchaseUrl: "",
    commodityOriginPrice: "",
    commodityCurrentPrice: "",
    commodityRemark: "",
    qualityIndex: 0,
    // 成色，1-10
    qualities: Object.values(getQualitiesMap()).sort((a, b) => b.value - a.value),
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    // 读取商品分类信息
    const resp = await api.getCategory();
    if (resp.isError) {
      wx.showToast({
        title: '获取分类失败',
      });
      return;
    }
    this.setData({ categories: resp.data, })
  },

  onNavigateBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  // 表单
  onChangeCommodityContent(event) {
    this.setData({
      commodityContent: event.detail.value
    })
  },
  onChangeCommodityCurrentPrice(event) {
    this.setData({
      commodityCurrentPrice: event.detail.value
    })
  },
  onChangeCommodityPurchaseUrl(event) {
    this.setData({
      commodityPurchaseUrl: event.detail.value
    })
  },
  onChangeCommodityCategory(event) {
    this.setData({
      categoryIndex: event.detail.value
    })
  },

  // 添加详情图
  onUpdateCommodityImg(e) {
    wx.chooseImage({
      count: 9, //默认9
      sizeType: ['original', 'compressed'], //可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album'], //从相册选择
      success: (res) => {
        if (this.data.commodityImg.length != 0) {
          this.setData({
            commodityImg: this.data.commodityImg.concat(res.tempFilePaths)
          })
        } else {
          this.setData({
            commodityImg: res.tempFilePaths
          })
        }
      }
    });
  },
  onViewCommodityImg(e) {
    wx.previewImage({
      urls: this.data.commodityImg,
      current: e.currentTarget.dataset.url
    });
  },
  onDelCommodityImg(e) {
    this.data.commodityImg.splice(e.currentTarget.dataset.index, 1);
    this.setData({
      commodityImg: this.data.commodityImg
    })
  },
  onChangeQuality(e) {
    const idx = e.detail.value;
    this.setData({
      qualityIndex: idx,
    })
  },

  // 验证表单格式
  isValid(params) {
    console.log(params)
    if (!rules.required(params.price_now)) {
      return new RespError("商品现价不能为空！")
    }
    if (!rules.required(params.content)) {
      return new RespError("商品详情不能为空！")
    }
    if (!rules.required(params.img_urls)) {
      return new RespError("商品详情图不能为空！")
    }
    if (!rules.required(params.cid)) {
      return new RespError("商品分类不能为空！")
    }
    if (!rules.required(params.quality)) {
      return new RespError("商品成色不能为空！")
    }
    if (params.price_now < 0) {
      return new RespError("商品现价至少为0")
    }
    return new RespSuccess()
  },

  // 上传商品信息
  async onCommodityRelease() {
    const resp = await api.createCommodity({
      rid: app.globalData.self.rid,
      cid: this.data.categories[this.data.categoryIndex]._id,
      content: this.data.commodityContent,
      price: this.data.commodityCurrentPrice,
      quality: this.data.qualities[this.data.qualityIndex].value,
      img_urls: this.data.commodityImg,
      sex: 0,
    });
    if (resp.isError) {
      await wx.showToast({ title: '创建失败', });
      return;
    }
    await wx.showToast({ title: '发布成功！', duration: 1500, mask: true });
    await sleep(1500);
    await wx.navigateBack({ delta: 1, });
// // 订阅消息：当有人购买用户发布的商品时，推送消息给此用户
// const tmplId = 's9MweXoRKb_IWTm0edo6Ztso2BLcWSrYuTcNT1cDTME'
// wx.requestSubscribeMessage({
//   tmplIds: [tmplId],
//   complete: async (res) => {
//     res = await cache.getMyInfoAndMyUniversityInfo()
//     if (res.errno == -1) {
//       console.log("获取我的信息和我的大学信息失败！")
//     }
//     console.log(res)
//     const myInfoAndMyUniversityInfo = res.data
//     const userPrimaryKey = myInfoAndMyUniversityInfo._id
//     uid = myInfoAndMyUniversityInfo.uid
//     let uploadParams = {
//       cid: cid,
//       content: this.data.commodityContent,
//       title: this.data.commodityTitle,
//       number: parseInt(this.data.commodityNumber),
//       origin_url: this.data.commodityPurchaseUrl ? this.data.commodityPurchaseUrl : "",
//       price_origin: parseFloat(this.data.commodityOriginPrice),
//       price_now: parseFloat(this.data.commodityCurrentPrice),
//       remark: this.data.commodityRemark ? this.data.commodityRemark : "",
//       uid: uid,
//       userPrimaryKey
//     }
//     res = this.isValid(uploadParams)

//     if (res.errno == -1) {
//       Dialog.alert({
//         title: '格式错误',
//         message: res.message,
//       })
//       return
//     }

//     // 上传图片到云存储，获取fileId
//     if (this.data.thumbnail.length == 0 || this.data.commodityImg.length == 0) {
//       wx.hideLoading()
//       Dialog.alert({
//         title: '格式错误',
//         message: "至少上传一张缩略图和一张详情图！",
//       })
//       return
//     }

//     wx.showLoading({
//       title: '上传中',
//     })

//     params = {
//       thumbnail: this.data.thumbnail,
//       commodityImg: this.data.commodityImg,
//     }
//     res = await api.uploadImgAndGetFileID(params)
//     if (res.errno != 0) {
//       wx.hideLoading()
//       console.log("上传信息失败！")
//       wx.showToast({
//         title: res.message,
//         icon: 'none',
//         duration: 2000,
//         success(res) {
//           setTimeout(() => {
//           }, 1500)
//         }
//       })
//       return
//     }

//     const fileIDs = res.data

//     // 上传数据到云数据库
//     const thumbnailFileID = fileIDs.splice(0, 1)
//     const commodityImgFileID = fileIDs
//     uploadParams["thumbnail_url"] = thumbnailFileID
//     uploadParams["img_url"] = commodityImgFileID

//     res = await api.setCommodityDetail(uploadParams)
//     if (res.errno != 0) {
//       wx.hideLoading()
//       console.log("上传信息失败！")
//       wx.showToast({
//         title: res.message,
//         icon: 'none',
//         duration: 2000,
//         success(res) {
//           setTimeout(() => {
//           }, 1500)
//         }
//       })

//       // 若数据上传失败，需要删除已经上传的图片
//       res = await api.delImg({ fileIDs })
//       if (res.errno != 0) {
//         console.log(res.message)
//       }
//       return
//     }
//     // 清空缓存
//     wx.clearStorageSync()
//     wx.hideLoading()

//     wx.showToast({
//       title: '上传成功！',
//       icon: 'success',
//       duration: 2000,
//       success(res) {
//         setTimeout(() => {
//           wx.redirectTo({
//             url: `../commodity_list/commodity_list?uid=${uid}`,
//           })
//         }, 1500)
//       }
//     })
//   }
// })
  }
})