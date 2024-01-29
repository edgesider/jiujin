import api from "../../api/api";
import getConstants from "../../constants";

const app = getApp();
const COUNT_PER_PAGE = 8

Page({
  data: {
    ...getConstants(),
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
    const resp = await api.getCommodityList({
      sell_id: self._id,
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

  async onPolish(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const commodity = this.data.commodityList[idx];
    console.log(idx, this.data.commodityList);
    await wx.showLoading({ mask: true, title: '擦亮中...' });
    const resp = await api.polishCommodity({ id: commodity._id });
    await wx.hideLoading();
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
    await this.fetchSingle(idx);
  },
  // 下架
  async onOff(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const commodity = this.data.commodityList[idx];
    await wx.showLoading({ mask: true, title: '正在下架...' });
    const resp = await api.offCommodity({
      id: commodity._id,
    });
    await wx.hideLoading();
    if (resp.isError) {
      console.error(resp)
      await wx.showToast({ title: '下架失败', icon: 'error', mask: true });
      return;
    }
    await wx.showToast({ title: '下架成功', icon: 'success', mask: true });
    await this.fetchSingle(idx);
  },
  async onEdit(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const commodity = this.data.commodityList[idx];
    await wx.navigateTo({
      url: `../commodity_publish/index?commodity=${JSON.stringify(commodity)}&isEdit=1`,
      events: {
        afterEdited: async () => {
          await this.fetchSingle(idx);
        }
      },
    })
  },
  async onDelete(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const commodity = this.data.commodityList[idx];
    await wx.showModal({
      title: '提示',
      content: `确认删除`,
      success: async (res) => {
        if (res.confirm) {
          await wx.showLoading({ title: '删除中...', mask: true })
          const resp = await api.deleteCommodity({ id: commodity._id })
          if (resp.isError) {
            await wx.showToast({ title: '删除失败', icon: 'error', mask: true });
          } else {
            await wx.hideLoading();
            await this.reload();
          }
        } else if (res.cancel) {
          // pass
        }
      }
    })
  },
  async onRepublish(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const commodity = this.data.commodityList[idx];
    await wx.navigateTo({
      url: `../commodity_publish/index?commodity=${JSON.stringify(commodity)}`,
      events: {
        afterPublished: async () => {
          await this.reload();
        }
      },
    })
  },

  onNavigateBack() {
    wx.navigateBack({
      delta: 1
    })
  },
})