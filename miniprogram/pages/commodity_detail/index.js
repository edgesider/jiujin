import api from "../../api/api";

const app = getApp();
import { tryJsonParse } from "../../utils/other";
import { sleep } from "../../utils/time";

Page({
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    loading: true,
    commodity: null,
    seller: null,
    contentParagraphs: [],
  },
  onLoad: async function (options) {
    // TODO 路由可能有长度限制，后续考虑使用其他方案
    const { commodity: commodityJson } = options;
    const commodity = tryJsonParse(decodeURIComponent(commodityJson));
    const sellerResp = await api.getUserInfo(commodity.sell_id);
    if (sellerResp.isError) {
      await wx.showToast({ title: '网络错误', icon: 'error' });
      return;
    }
    // await sleep(500);
    this.setData({
      loading: false,
      commodity,
      contentParagraphs: commodity.content.split('\n'),
      seller: sellerResp.data,
    });
  },

  back() {
    wx.navigateBack().then();
  }
});