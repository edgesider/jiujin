import api, { getOpenId } from "../../api/api";
import { decodeOptions, getQualitiesMap } from "../../utils/strings";
import { setNeedRefresh } from "../home/index";
import { sleep, toastError, toastInfo, toastLoading, toastLoadingHide, toastSucceed } from "../../utils/other";
import getConstants from "../../constants";
import { NotifyType, requestNotifySubscribes } from "../../utils/notify";
import { waitForAppReady } from "../../utils/globals";
import { ErrCode } from "../../api/ErrCode";
import { compressImage } from "../../utils/canvas";
import { metric } from "../../utils/metric";
import { DialogType, openDialog } from "../../utils/router";
import { onShareApp, onShareCommodity } from "../../utils/share";
import { CommodityAPI } from "../../api/CommodityAPI";

const app = getApp()

Page({
  data: {
    ...getConstants(),
    self: null,
    // 可选成色，1-10
    qualities: Object.values(getQualitiesMap()).sort((a, b) => b.value - a.value),
    // 编辑模式下正在编辑的商品，如果是新建则为null
    editingCommodity: null,
    // 按钮文案
    buttonText: '',

    commodityImg: [],
    commodityContent: "",
    commodityCurrentPriceText: '',
    // 单位：分
    priceFen: -1,
    qualityIndex: 0,

    filters: [
      { text: '全部可见', key: 'all', selected: true },
      { text: '同校区可见', key: 'campus', selected: false },
      { text: '同性别可见', key: 'sex', selected: false },
      { text: '同楼可见', key: 'building', selected: false },
    ],
    filtration: ["全部可见", "同校区可见", "同性别可见", "同楼可见"],
    choose_filtration: "全部可见",

    published: false,
  },

  async onLoad(options) {
    await waitForAppReady();
    const { self } = app.globalData;
    this.setData({ self });

    options = decodeOptions(options);
    const {
      isEdit = false, // 是否是编辑
      commodity: commodityJson = null // 编辑或重新发布时，要填充的数据
    } = options;
    const commodity = commodityJson ? JSON.parse(commodityJson) : null;
    if (isEdit) {
      if (!commodity) {
        toastError('无法编辑不存在的商品');
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
        commodityCurrentPriceText: (commodity.price / 100).toString(),
        qualityIndex: this.data.qualities.findIndex(q => q.value === commodity.quality),
        filters: [
          { text: '全部可见', key: 'all', selected: !only_same_campus && !only_same_sex && !only_same_building },
          { text: '同校区可见', key: 'campus', selected: Boolean(only_same_campus) },
          { text: '同性别可见', key: 'sex', selected: Boolean(only_same_sex) },
          { text: '同楼可见', key: 'building', selected: Boolean(only_same_building && !only_same_campus) },
        ],
      });
    }
    data.buttonText = isEdit ? '保存' : '发布';
    this.setData(data);
  },

  // 表单
  onChangeCommodityContent(event) {
    this.setData({
      commodityContent: event.detail.value
    })
  },
  onPriceInputBlur() {
    if (this.data.commodityCurrentPriceText.length === 0) {
      this.setData({
        priceFen: -1,
      });
      return;
    }
    let priceYuan = parseFloat(this.data.commodityCurrentPriceText) || 0;
    priceYuan = Math.max(Math.min(priceYuan, 99999), 0)
    this.setData({
      priceFen: priceYuan * 100,
      commodityCurrentPriceText: priceYuan.toString(10),
    })
  },
  onChangeCommodityCurrentPrice(event) {
    const text = event.detail.value;
    const valid = /^\d*(\.\d{0,2})?$/.test(text);
    this.setData({
      commodityCurrentPriceText: valid ? text : this.data.commodityCurrentPriceText
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
      current: e.currentTarget.dataset.url,
      urls: this.data.commodityImg,
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
    const all = filters.find(f => f.key === 'all');
    const campus = filters.find(f => f.key === 'campus');
    const building = filters.find(f => f.key === 'building');
    const sex = filters.find(f => f.key === 'sex');
    if (filter.key === 'all') {
      if (all.selected) {
        return;
      } else {
        all.selected = true;
        for (const filter of filters) {
          if (filter !== all) {
            filter.selected = false;
          }
        }
      }
    } else {
      all.selected = false;
      if (filter.selected && [campus, building, sex].filter(f => f !== filter).every(f => !f.selected)) {
        // 如果其他俩开关都关掉的话，这个就不能关了
        return;
      }
      filter.selected = !filter.selected;
    }
    if (filter.key === 'campus' && filter.selected) {
      filters.find(f => f.key === 'building').selected = false;
    } else if (filter.key === 'building' && filter.selected) {
      filters.find(f => f.key === 'campus').selected = false;
    }
    this.setData({ filters });
  },

  // 验证表单格式
  checkForm(params) {
    if (!params.content) {
      return '请填写物品描述';
    }
    if (params.img_urls.length === 0) {
      return '请至少上传一张商品图片';
    }
    if (typeof params.price !== 'number' || params.price < 0) {
      return '请指定物品价格';
    }
    return null;
  },

  async uploadImages(paths) {
    const fileIDs = [];
    for (let path of paths) {
      if (/^(cloud|http|https):\/\//.test(path) && !/http:\/\/tmp\//.test(path)) {
        fileIDs.push(path);
      } else {
        const resp = await api.uploadImage(
          await compressImage(path, { width: 720 }),
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

  async doSubmit() {
    // 更新一下输入的价格值
    this.onPriceInputBlur();

    const {
      editingCommodity: editing,
      commodityContent,
      priceFen,
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
      content: commodityContent,
      price: priceFen,
      quality: qualities[qualityIndex].value,
      img_urls: commodityImg,
      all_visible: filters.find(f => f.key === 'all').selected,
      only_same_campus: filters.find(f => f.key === 'campus').selected,
      only_same_sex: filters.find(f => f.key === 'sex').selected,
      only_same_building: filters.find(f => f.key === 'building').selected,
    });
    const error = this.checkForm(info);
    if (error) {
      return error;
    }
    await requestNotifySubscribes([NotifyType.Message]);

    console.log(editing ? 'editing commodity' : 'creating commodity', info);
    console.log('uploading images', info.img_urls);
    toastLoading('正在上传图片');
    try {
      info.img_urls = await this.uploadImages(info.img_urls);
    } catch (e) {
      console.error('upload failed', e);
      return '图片上传失败';
    }
    console.log('uploaded images', info.img_urls);

    toastLoading(editing ? '正在保存' : '正在发布');

    const resp = editing
      ? await CommodityAPI.update(editing._id, info)
      : await CommodityAPI.create(info);
    toastLoadingHide();
    if (resp.isError) {
      console.error(resp);
      let err = editing ? '保存失败' : '发布失败';
      if (resp.errno === ErrCode.SecCheckError) {
        err = '内容含有违法违规内容';
      }
      return err;
    }
    this.getOpenerEventChannel().emit(editing ? 'afterEdited' : 'afterPublished');
    if (!editing) {
      // TODO 使用Channel
      setNeedRefresh();
    }
    wx.navigateBack();

    // if (!editing) {
    //   this.setData({ published: resp.data });
    //   await openDialog(DialogType.PublishSuccessDialog);
    // } else {
    //   wx.navigateBack();
    // }
  },

  submitting: false,
  // 上传商品信息
  async onSubmit() {
    if (this.submitting) {
      return;
    }
    this.submitting = true;
    let errMsg;
    let error;
    try {
      toastLoading('请稍后');
      errMsg = await this.doSubmit();
    } catch (e) {
      console.error(e);
      error = e;
      errMsg = this.data.editingCommodity ? '保存失败' : '发布失败';
    } finally {
      this.submitting = false;
      toastLoadingHide();
    }
    if (errMsg) {
      toastError(errMsg);
      metric.write('commodity_submit_failed', {}, {
        type: this.data.editingCommodity ? 'edit' : 'create',
        msg: errMsg,
        error: error?.toString()
      });
    }
  },

  onShareWxClick() {
  },
  onSharePyqClick() {
    // toastInfo('暂不支持？');
    wx.showActionSheet({
      itemList: ['复制链接', '分享海报', '分享微信'],
    })
  },
  onShareDismissClick() {
    wx.navigateBack();
  },

  async onShareAppMessage(options) {
    if (this.data.published) {
      toastLoading('请稍后');
      try {
        return await onShareCommodity(null, this.data.published);
      } finally {
        toastLoadingHide();
      }
    } else {
      return onShareApp();
    }
  }
})