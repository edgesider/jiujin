import api from "../../api/api";

const app = getApp();
const COUNT_PER_PAGE = 8

Page({

  /**
   * 页面的初始数据
   */
  data: {
    CustomBar: app.globalData.CustomBar,
    cursor: 0,
    isLoading: true,
    commodityList: [],
    tab: 'bought', // 'bought' | 'sells'
  },
  async onLoad() {
    await this.fetchMore();
  },

  async onShow() {
  },

  async fetchMore() {
    this.setData({
      isLoading: true,
    })
    const { self } = app.globalData;
    const resp = await api.getCommodityList(self.rid, {
      seller_id: self._id,
      start: this.data.cursor,
      count: COUNT_PER_PAGE,
    })
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
    this.setData({
      commodityList: this.data.commodityList.concat(data),
      cursor: this.data.cursor + data.length,
      isLoading: false,
    })
  },

  // 加载更多
  async onReachBottom() {
    this.fetchMore();
  },

  onNavigateBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  // 标签选择
  async tabSelect(e) {
  },
})