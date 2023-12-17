const app = getApp()
const api = require('../../api/api')
const cache = require("../../cache/cache")
const rules = require('../../utils/rules')
const { RespSuccess, RespError } = require('../../utils/resp')
const { sleep } = require('../../utils/time');
const { getQualitiesMap } = require('../../utils/strings');
const { setNeedRefresh } = require('../home/index');
import Dialog from '@vant/weapp/dialog/dialog';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    commodityImg: [],
    categoryIndex: 0,
    categories: [{ _id: 0, name: '其他' }],
    commodityContent: "",
    commodityCurrentPrice: null,
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
    try {
      const price = parseFloat(event.detail.value);
      this.setData({
        commodityCurrentPrice: price
      })
    } catch (e) {
      console.error('invalid price');
    }
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
      sizeType: ['compressed'], //可以指定是原图还是压缩图，默认二者都有
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
  checkForm(params) {
    if (!rules.required(params.content)) {
      return '请填写商品描述';
    }
    if (!rules.required(params.img_urls)) {
      return '请至少上传一张商品图片';
    }
    if (!rules.required(params.cid)) {
      return '请选择商品分类';
    }
    if (!rules.required(params.quality)) {
      return '请选择成色';
    }
    if (typeof params.price !== 'number' || params.price < 0) {
      return '无效的价格';
    }
    return null;
  },

  /**
   * 上传本地图片到云存储
   * TODO 压缩上传
   * TODO 合规检验
   *
   * @param path 本地路径（如wx.chooseImage得到的临时路径）
   * @returns {Promise<Resp>} 上传结果，其中包含云存储中的fileID
   */
  async uploadImage(path) {
    const { self: selfInfo } = app.globalData;
    if (!selfInfo) {
      return new RespError(null, 'need login');
    }
    const res = await wx.cloud.uploadFile({
      filePath: path,
      cloudPath: `commodity/${selfInfo._id}_${Date.now()}_${Math.random() * 10000000}`,
    });
    if (!res.fileID) {
      return new RespError(res, 'upload failed');
    }
    return new RespSuccess(res.fileID);
  },

  async uploadImages(paths) {
    const fileIDs = [];
    for (const path of paths) {
      const resp = await this.uploadImage(path);
      if (resp.isError) {
        throw resp.message;
      }
      fileIDs.push(resp.data);
    }
    return fileIDs;
  },

  // 上传商品信息
  async onCommodityRelease() {
    const info = {
      rid: app.globalData.self.rid,
      cid: this.data.categories[this.data.categoryIndex]._id,
      content: this.data.commodityContent,
      price: this.data.commodityCurrentPrice,
      quality: this.data.qualities[this.data.qualityIndex].value,
      img_urls: this.data.commodityImg,
      sex: 0,
    };
    const error = this.checkForm(info);
    if (error) {
      Dialog.alert({ title: error, })
      return;
    }
    console.log('creating commodity', info);
    console.log('uploading images', info.img_urls);
    await wx.showLoading({ title: '正在上传图片', mask: true });
    try {
      info.img_urls = await this.uploadImages(info.img_urls);
    } catch (e) {
      console.error('upload failed', e);
      await wx.showToast({ title: '图片上传失败', mask: true, icon: 'error' });
      return;
    } finally {
      await wx.hideLoading();
    }
    console.log('uploaded images', info.img_urls);
    await wx.showLoading({ title: '正在发布', mask: true });
    const resp = await api.createCommodity(info);
    await wx.hideLoading();
    if (resp.isError) {
      await wx.showToast({ title: '创建失败', });
      return;
    }
    setNeedRefresh();
    await wx.showToast({ title: '发布成功！', duration: 1500, mask: true });
    await sleep(1500);
    await wx.navigateBack();
  }
})