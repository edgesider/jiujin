import api, { CollectApi } from "../../api/api";
import { tryJsonParse } from "../../utils/other";
import { sleep, splitMillisecondsToString } from "../../utils/time";
import { setNeedRefresh } from "../home/index";
import getConstants, { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SALE, COMMODITY_STATUS_SELLING } from "../../constants";

const app = getApp();
const DURATION_IN_FEED = 1000 * 60 * 60 * 24 * 2;

Page({
  data: {
    ...getConstants(),
    ridToRegion: {},
    loading: true,
    isMine: false,
    commodity: null,
    createTime: '',
    seller: null,
    contentParagraphs: [],
    remainTime: '',
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

    const sellerResp = await api.getUserInfo(commodity.sell_id);
    const seller = sellerResp.isError ? null : sellerResp.data;
    this.setData({
      loading: false,
      commodity,
      createTime: new Date(commodity.create_time).toLocaleDateString(),
      remainTime: this.calcRemainTimeStr(commodity),
      seller,
      contentParagraphs: commodity.content.split('\n').map(s => s.trim()),
      ridToRegion: app.globalData.ridToRegion,
      isMine: app.globalData.self._id === commodity.sell_id,
    });
  },
  calcRemainTimeStr(commodity) {
    const updateTime = new Date(commodity.update_time);
    const now = new Date();
    const remainMs = updateTime.getTime() + DURATION_IN_FEED - now.getTime();
    return splitMillisecondsToString(Math.max(remainMs, 0), true);
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

  async onPrivateMessage() {
    const registered = app.globalData.registered;
    if (registered) {
      app.globalData.commodity = null;
      const user_id = 'USER' + app.globalData.self._id;
      const sell_id = 'REPY' + this.data.commodity.sell_id + this.data.commodity._id;
      const conversation_id = encodeURIComponent('C2C' + sell_id);
      wx.navigateTo({
        url: `../../TUIService/pages/tim_index/tim_index?id=${conversation_id}&user=${user_id}`,
      });
    } else {
      await wx.showToast({
        title: '登录后可使用私聊功能',
        icon: 'error',
        mask: true,
      });
    }
  },
});