import api, { CollectApi } from "../../api/api";
import getConstants, { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SALE, COMMODITY_STATUS_SELLING } from "../../constants";
import moment from "moment";
import { setTabBar } from "../../utils/other";

const app = getApp();
const COUNT_PER_PAGE = 8

Page({
  data: {
    ...getConstants(),
    cursor: 0,
    isLoading: false,
    commodityList: [],
    ridToRegion: null,
  },

  async onLoad() {
    await app.waitForReady();
    await this.fetchMore();
  },

  gotoDetail(res){
    const idx = res.currentTarget.dataset.idx;
    const commodity = this.data.commodityList[idx];
    const id = commodity._id;
    // 进入商品页面
    wx.navigateTo({
      url: `../commodity_detail/index?id=${id}`
    });
  },

  async fetchMore() {
    if (this.data.isLoading) {
      return;
    }
    this.setData({
      isLoading: true,
    })
    const resp = await CollectApi.getAll(this.data.cursor, COUNT_PER_PAGE);
    if (resp.isError) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
        mask: true,
        isLoading: false,
      })
      return;
    }
    const { data } = resp;
    for (var i = 0; i < data.length; i++){
      data[i].status = null;
      data[i].create_time = new Date(data[i].create_time).toLocaleDateString();
      data[i].update_time = moment(data[i].update_time).fromNow();
    }
    this.setData({
      commodityList: this.data.commodityList.concat(data),
      cursor: this.data.cursor + data.length,
      isLoading: false,
    })
  },

  async fetchSingle(idx) {
    const commodity = this.data.commodityList[idx];
    const resp = await api.getCommodityInfo({ id: commodity._id });
    if (resp.isError) {
      return;
    }
    this.data.commodityList[idx] = resp.data;
    this.setData({
      commodityList: this.data.commodityList
    });
  },

  async reload() {
    this.setData({
      cursor: 0,
      commodityList: [],
    });
    await this.fetchMore();
  },

  // 加载更多
  async onReachBottom() {
    await this.fetchMore();
  },

  async onPullDownRefresh() {
    await this.reload();
    await wx.stopPullDownRefresh();
  },

  onNavigateBack() {
    wx.navigateBack({
      delta: 1
    })
  },
})