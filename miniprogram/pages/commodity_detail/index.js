const app = getApp();
import { tryJsonParse } from "../../utils/other";

Page({
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    loading: true,
    commodity: null,
  },
  onLoad: function (options) {
    const { commodity: commodityJson } = options;
    const commodity = tryJsonParse(decodeURIComponent(commodityJson));
    setTimeout(() => {
      console.log(commodity);
      this.setData({
        commodity,
        loading: false,
      });
    }, 500);
  },

  back() {
    wx.navigateBack().then();
  }
});