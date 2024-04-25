import api, { getOpenId } from "../../api/api";
import Dialog from '@vant/weapp/dialog/dialog';
import rules from "../../utils/rules";
import { getQualitiesMap } from "../../utils/strings";
import { setNeedRefresh } from "../home/index";
import { sleep, textToPrice } from "../../utils/other";
import getConstants, { GENDER } from "../../constants";
import { NotifyType, requestNotifySubscribe } from "../../utils/notify";

const app = getApp()

Page({
  data: {
    ...getConstants(),
    self: null,
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
    commodityCurrentPriceText: '',
    commodityCurrentPrice: 0,
    qualityIndex: 0,

    filters: [
      { text: '全部可见', key: 'all', selected: true },
      { text: '同校区可见', key: 'campus', selected: false },
      { text: '同性别可见', key: 'sex', selected: false },
      { text: '同楼可见', key: 'building', selected: false },
    ],
    filtration: ["全部可见", "同校区可见", "同性别可见", "同楼可见"],
    choose_filtration: "全部可见"
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await app.waitForReady();
    const { self, categories } = app.globalData;
    this.setData({
      self, categories
    })

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
      const {
        only_same_campus,
        only_same_sex,
        only_same_building,
      } = commodity;
      Object.assign(data, {
        commodityImg: commodity.img_urls,
        commodityContent: commodity.content,
        commodityCurrentPrice: commodity.price,
        categoryIndex: this.data.categories.findIndex(c => c._id === commodity.cid),
        qualityIndex: this.data.qualities.findIndex(q => q.value === commodity.quality),
        filters: [
          { text: '全部可见', key: 'all', selected: !only_same_campus && !only_same_sex && !only_same_building },
          { text: '同校区可见', key: 'campus', selected: Boolean(only_same_campus) },
          { text: '同性别可见', key: 'sex', selected: Boolean(only_same_sex) },
          { text: '同楼可见', key: 'building', selected: Boolean(only_same_building) },
        ],
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
  onPriceInputBlur() {
    if (this.data.commodityCurrentPriceText.length === 0) {
      // 支持空白
      this.setData({
        commodityCurrentPrice: 0,
      });
      return;
    }
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
        if (this.data.commodityImg.length !== 0) {
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
  async onDelCommodityImg(e) {
    const res = await wx.showModal({
      title: '确认删除这张照片？'
    });
    if (res.confirm) {
      this.data.commodityImg.splice(e.currentTarget.dataset.index, 1);
      this.setData({
        commodityImg: this.data.commodityImg
      })
    }
  },
  onChangeQuality(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    this.setData({
      qualityIndex: idx,
    })
  },

  onFilterClick(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const filters = this.data.filters;
    const filter = filters[idx];
    if (filter.key === 'all') {
      for (const filter of filters) {
        filter.selected = filter.key === 'all';
      }
    } else {
      filters.find(f => f.key === 'all').selected = false;
      filter.selected = !filter.selected;
    }
    this.setData({ filters });
  },

  // 验证表单格式
  checkForm(params) {
    if (!rules.required(params.content)) {
      return '请填写商品描述';
    }
    if (params.img_urls.length === 0) {
      return '请至少上传一张商品图片';
    }
    // if (!rules.required(params.cid)) {
    //   return '请选择商品分类';
    // }
    if (!rules.required(params.quality)) {
      return '请选择成色';
    }
    if (typeof params.price !== 'number' || params.price < 0) {
      return '无效的价格';
    }
    return null;
  },

  async uploadImages(paths) {
    const fileIDs = [];
    for (const path of paths) {
      if (/^(cloud|http|https):\/\//.test(path) && !/http:\/\/tmp\//.test(path)) {
        fileIDs.push(path);
      } else {
        const resp = await api.uploadImage(
          path,
          `commodity/${getOpenId()}_${Date.now()}_${Math.random() * 10000000}`
        );
        if (resp.isError) {
          throw resp.message;
        }
        fileIDs.push(resp.data);
      }
    }
    return fileIDs;
  },

  // 上传商品信息
  async onSubmit() {
    await requestNotifySubscribe([NotifyType.BookingRequest, NotifyType.BookingAgreed]);
    // 更新一下输入的价格值
    this.onPriceInputBlur();

    const {
      editingCommodity: editing,
      self,
      categories,
      categoryIndex,
      commodityContent,
      commodityCurrentPrice,
      qualityIndex,
      qualities,
      commodityImg,
      filters,
    } = this.data;
    const info = editing // 编辑商品时的初始值
      ?? {
        // 新建商品时的默认值
        rid: Number(app.globalData.self.rid),
        sex: 0,
      };
    Object.assign(info, {
      // 从表单中更新
      cid: categories[categoryIndex]?._id,
      content: commodityContent,
      price: commodityCurrentPrice,
      quality: qualities[qualityIndex].value,
      img_urls: commodityImg,
      all_visible: filters.find(f => f.key === 'all').selected,
      only_same_campus: filters.find(f => f.key === 'campus').selected,
      only_same_sex: filters.find(f => f.key === 'sex').selected,
      only_same_building: filters.find(f => f.key === 'building').selected,
    });
    const error = this.checkForm(info);
    if (error) {
      await wx.showToast({
        title: error,
        icon: 'error',
      })
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