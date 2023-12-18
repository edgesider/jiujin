import api from "../../api/api";

const app = getApp();
import { tryJsonParse } from "../../utils/other";

Page({
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    loading: true,
    commodity: null,
    seller: null,
    contentParagraphs: [],
    ridToRegion: {},
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
      contentParagraphs: commodity.content.split('\n'),
      seller,
      ridToRegion: app.globalData.ridToRegion
    });
    console.log(seller)
  },

  back() {
    wx.navigateBack().then();
  }
});