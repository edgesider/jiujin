import api, { CollectApi } from "../../api/api";
import { splitMillisecondsToString } from "../../utils/time";
import { setNeedRefresh } from "../home/index";
import getConstants from "../../constants";
import { assertRegistered, getRegionPath, sleep } from "../../utils/other";
import moment from "moment";
import { openProfile } from "../../router";

const app = getApp();

Page({
  data: {
    ...getConstants(),
    ridToRegion: {},
    loading: true,
    isMine: false,
    commodity: null,
    createTime: '',
    polishTime: '',
    regionName: '',
    seller: null,
    contentParagraphs: [],
    firstImageSize: [],
  },
  onLoad: async function (options) {
    const { id } = options;
    const commResp = await api.getCommodityInfo({ id });
    if (commResp.isError) {
      await wx.showToast({
        icon: 'error',
        title: '网络错误'
      });
      return;
    }
    const commodity = commResp.data;

    const sellerResp = await api.getUserInfo(commodity.seller_id);
    const seller = sellerResp.isError ? null : sellerResp.data;

    let firstImageSize = [0, 0];
    if (commodity.img_urls.length === 1) {
      try {
        const size = await wx.getImageInfo({ src: commodity.img_urls[0] });
        firstImageSize = [size.width, size.height];
      } catch (e) {
        firstImageSize = [500, 500];
      }
    }

    const { self } = app.globalData;

    this.setData({
      loading: false,
      commodity,
      createTime: moment(commodity.create_time).format('YYYY-MM-DD HH:mm'),
      polishTime: moment(commodity.polish_time ?? commodity.create_time).fromNow(),
      seller,
      contentParagraphs: commodity.content.split('\n').map(s => s.trim()),
      regionName: this.getRegionName(commodity.rid),
      isMine: self && self._id === commodity.seller_id,
      firstImageSize,
    });
  },
  /**
   * 获取展示的区域名，显示第1、3级
   */
  getRegionName(rid) {
    const path = getRegionPath(rid);
    const region = path[0];
    const parentParent = path[2];
    return parentParent ? `${parentParent.name} / ${region.name}` : region.name;
  },

  back() {
    wx.navigateBack().then();
  },

  polishing: false,
  async polish() {
    if (this.polishing)
      return;
    this.polishing = true;
    await wx.showLoading({ mask: true, title: '擦亮中...' });
    const resp = await api.polishCommodity({ id: this.data.commodity._id });
    await wx.hideLoading();
    this.polishing = false;
    if (resp.isError) {
      await wx.showToast({
        title: '擦亮太频繁啦',
        icon: 'error',
        mask: true,
      });
      return;
    }
    await wx.showToast({
      title: '擦亮成功',
      icon: 'success',
      mask: true,
      duration: 500,
    });
    await sleep(500);
    setNeedRefresh();
    this.back();
  },

  async previewImages(param) {
    const { curr } = param.currentTarget.dataset;
    await wx.previewImage({
      current: curr,
      urls: this.data.commodity.img_urls
    });
  },

  togglingCollect: false,
  async onToggleCollect() {
    assertRegistered();
    if (this.togglingCollect) {
      return;
    }
    this.togglingCollect = true;
    try {
      if (this.data.commodity.is_collected) {
        const resp = await CollectApi.cancel(this.data.commodity._id);
        if (resp.isError) {
          await wx.showToast({
            title: '取消收藏失败',
            icon: 'error',
          });
          return;
        }
      } else {
        const resp = await CollectApi.collect(this.data.commodity._id);
        if (resp.isError) {
          await wx.showToast({
            title: '收藏失败',
            icon: 'error',
          });
          return;
        }
      }
      this.setData({
        commodity: Object.assign(
          {},
          this.data.commodity,
          { is_collected: !this.data.commodity.is_collected }
        )
      })
    } finally {
      this.togglingCollect = false;
    }
  },

  onClickReport() {
    assertRegistered();
    // TODO
  },

  async onClickShare() {
    assertRegistered();
    const {} = await wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    })
  },

  async onPrivateMessage() {
    assertRegistered();
    if (app.globalData.self) {
      app.globalData.commodity = null;
      app.globalData.targetCommodity = this.data.commodity;
      await wx.switchTab({
        url: "/pages/chat/chat_list/index",
      });
    } else {
      await wx.showToast({
        title: '登录后可使用私聊功能',
        icon: 'error',
        mask: true,
      });
    }
  },

  async onAvatarClick() {
    await openProfile(this.data.seller);
  },

  onShareAppMessage(options) {
    return {
      title: '找到一个好东西，快来看看吧！',
      path: `/pages/commodity_detail/index?id=${this.data.commodity._id}`
    }
  },
});