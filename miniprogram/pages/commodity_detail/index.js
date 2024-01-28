import api from "../../api/api";
import { tryJsonParse } from "../../utils/other";
import { sleep, splitMillisecondsToString } from "../../utils/time";
import { setNeedRefresh } from "../home/index";

const app = getApp();
const DURATION_IN_FEED = 1000 * 60 * 60 * 24 * 2;

Page({
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
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
    // TODO 路由可能有长度限制，后续考虑使用其他方案
    const { commodity: commodityJson } = options;
    const commodity = tryJsonParse(decodeURIComponent(commodityJson));
    const resp = await api.getUserInfo(commodity.sell_id);
    const seller = resp.isError ? null : resp.data;
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
});