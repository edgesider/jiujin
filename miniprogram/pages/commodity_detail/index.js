import api, { CollectApi } from "../../api/api";
import { splitMillisecondsToString } from "../../utils/time";
import { setNeedRefresh } from "../home/index";
import getConstants from "../../constants";
import { sleep } from "../../utils/other";
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

    console.warn(commodity);
    const sellerResp = await api.getUserInfo(commodity.sell_id);
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

    this.setData({
      loading: false,
      commodity,
      createTime: moment(commodity.create_time).format('YYYY-MM-DD HH:mm'),
      polishTime: moment(commodity.update_time).fromNow(),
      seller,
      contentParagraphs: commodity.content.split('\n').map(s => s.trim()),
      ridToRegion: app.globalData.ridToRegion,
      isMine: app.globalData.self._id === commodity.sell_id,
      firstImageSize,
    });
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
      app.globalData.targetCommodity = this.data.commodity;
      wx.switchTab({
        url: `../../TUIService/pages/tim_index/tim_index`,
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
});