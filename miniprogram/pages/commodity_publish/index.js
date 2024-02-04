import api from "../../api/api";
import Dialog from '@vant/weapp/dialog/dialog';
import rules from "../../utils/rules";
import { RespError, RespSuccess } from "../../utils/resp";
import { sleep } from "../../utils/time";
import { getQualitiesMap } from "../../utils/strings";
import { setNeedRefresh } from "../home/index";

const app = getApp()

Page({
  data: {
    // 可选分类
    categories: [{ _id: 0, name: '其他' }],
    // 可选成色，1-10
    qualities: Object.values(getQualitiesMap()).sort((a, b) => b.value - a.value),
    // 编辑模式下正在编辑的商品，如果是新建则为null
    editingCommodity: null,
    // 按钮文案
    buttonText: '',

    commodityImg: [],
    categoryIndex: 0,
    commodityContent: "",
    commodityCurrentPriceText: '0',
    commodityCurrentPrice: 0,
    qualityIndex: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await this.getCategories();

    const {
      isEdit = false, // 是否是编辑
      commodity: commodityJson = null // 编辑或重新发布时，要填充的数据
    } = options;
    const commodity = commodityJson ? JSON.parse(commodityJson) : null;
    if (isEdit) {
      if (!commodity) {
        await wx.showToast({ icon: 'error', title: '无法编辑不存在的商品' });
        throw Error('无法编辑不存在的商品')
      }
    }

    const data = {
      editingCommodity: isEdit ? commodity : null,
    };
    if (commodity) {
      Object.assign(data, {
        commodityImg: commodity.img_urls,
        commodityContent: commodity.content,
        commodityCurrentPrice: commodity.price,
        categoryIndex: this.data.categories.findIndex(c => c._id === commodity.cid),
        qualityIndex: this.data.qualities.findIndex(q => q.value === commodity.quality),
      });
    }
    data.buttonText = isEdit ? '保存' : '发布';
    this.setData(data);
  },

  // 读取商品分类信息
  async getCategories() {
    const resp = await api.getCategory();
    if (resp.isError) {
      await wx.showToast({
        title: '获取分类失败',
      });
      return;
    }
    this.setData({
      categories: resp.data,
    })
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
  onPriceInputBlur(event) {
    let price = parseFloat(this.data.commodityCurrentPriceText) || 0;
    price = Math.max(Math.min(price, 99999.9), 0)
    this.setData({
      commodityCurrentPrice: price,
      commodityCurrentPriceText: price.toString(10),
    })
  },
  onChangeCommodityCurrentPrice(event) {
    const text = event.detail.value;
    const valid = /^\d*(\.\d{0,2})?$/.test(text);
    this.setData({
      commodityCurrentPriceText: valid ? text : this.data.commodityCurrentPriceText
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
      if (/^(cloud|http|https):\/\//.test(path) && !/http:\/\/tmp\//.test(path)) {
        fileIDs.push(path);
      } else {
        const resp = await this.uploadImage(path);
        if (resp.isError) {
          throw resp.message;
        }
        fileIDs.push(resp.data);
      }
    }
    return fileIDs;
  },

  // 上传商品信息
  async onCommodityRelease() {
    const { editingCommodity: editing } = this.data;
    const info = editing // 编辑商品时的初始值
      ?? {
        // 新建商品时的默认值
        rid: app.globalData.self.rid,
        sex: 0,
      };
    Object.assign(info, {
      // 从表单中更新
      cid: this.data.categories[this.data.categoryIndex]._id,
      content: this.data.commodityContent,
      price: this.data.commodityCurrentPrice,
      quality: this.data.qualities[this.data.qualityIndex].value,
      img_urls: this.data.commodityImg,
    });
    const error = this.checkForm(info);
    if (error) {
      Dialog.alert({ title: error, })
      return;
    }
    console.log(editing ? 'editing commodity' : 'creating commodity', info);

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

    await wx.showLoading({
      title: editing ? '正在保存' : '正在发布',
      mask: true
    });
    const resp =
      editing
        ? await api.updateCommodity(editing._id, info)
        : await api.createCommodity(info);
    await wx.hideLoading();
    if (resp.isError) {
      console.error(resp);
      await wx.showToast({
        title: editing ? '保存失败' : '发布失败',
        icon: 'error',
      });
      return;
    }
    this.getOpenerEventChannel().emit(editing ? 'afterEdited' : 'afterPublished');
    if (!editing) {
      // TODO 使用Channel
      setNeedRefresh();
    }
    await wx.showToast({
      title: editing ? '已保存' : '发布成功！',
      duration: 1500, mask: true
    });

    await sleep(1500);
    await wx.navigateBack();
  }
})