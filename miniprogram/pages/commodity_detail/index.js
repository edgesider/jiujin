const app = getApp();
import { tryJsonParse } from "../../utils/other";

Page({
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    loading: true,
    commodity: null,
    contentParagraphs: [],
  },
  onLoad: function (options) {
    const { commodity: commodityJson } = options;
    const commodity = tryJsonParse(decodeURIComponent(commodityJson));
    setTimeout(() => {
      this.setData({
        commodity,
        contentParagraphs: commodity.content.split('\n'),
        loading: false,
      });
    }, 500);
  },

  back() {
    wx.navigateBack().then();
  }
});