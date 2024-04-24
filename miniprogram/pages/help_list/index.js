// pages/help_list/index.ts
import getConstants from "../../constants";
import api from "../../api/api";

const app = getApp();
const COUNT_PER_PAGE = 12
Page({

  /**
   * 页面的初始数据
   */
  data: {
    ...getConstants(),
    pullDownRefreshing: false,
    isLoading: false,
    cursor: 0,
    helpList: [],

    title: '',
    currTab: '',
    tabs: [],
  },

  fetcher: async () => ({}),
  onClick: () => {},
  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    this.getOpenerEventChannel().on(
      'onParams',
      async ({ title, tabs, defaultTab, fetcher, onClick } = {}) => {
        if (!fetcher) {
          throw Error('fetcher is required');
        }
        if (onClick) {
          this.onClick = onClick;
        }
        this.fetcher = fetcher;
        this.setData({
          tabs, title, currTab: defaultTab || tabs?.[0]?.key,
        });
        await this.fetchMore();
      });
  },

  async fetchMore() {
    if (this.data.isLoading) {
      return;
    }
    this.setData({ isLoading: true, })
    const res = await this.fetcher({
      start: this.data.cursor,
      count: COUNT_PER_PAGE,
      currTab: this.data.currTab,
    })
    if (!res || res instanceof Error || !Array.isArray(res)) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
        mask: true,
        isLoading: false,
      })
      return;
    }
    this.setData({
      helpList: this.data.helpList.concat(res),
      cursor: this.data.cursor + res.length,
      isLoading: false,
    })
  },

  async fetchSingle(idx) {
    const help = this.data.helpList[idx];
    const resp = await api.getHelpInfo({ id: help._id });
    if (resp.isError) {
      return;
    }
    this.data.helpList[idx] = resp.data;
    this.setData({
      helpList: this.data.helpList
    });
  },

  async reload() {
    this.setData({
      cursor: 0,
      helpList: [],
    });
    await this.fetchMore();
  },

  async onRefresherRefresh() {
    this.setData({ pullDownRefreshing: true, })
    await this.fetchMore();
    this.setData({ pullDownRefreshing: false, })
  },

  async onClickCard(ev) {
    await this.processClick('click-card', ev);
  },

  async onPolish(ev) {
    await this.processClick('polish', ev);
  },
  // 变更为已完成
  async onDeactivate(ev) {
    await this.processClick('deactivate', ev);
  },
  async onEdit(ev) {
    await this.processClick('edit', ev);
  },
  async onDelete(ev) {
    await this.processClick('delete', ev);
  },
  async processClick(type, ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const help = this.data.helpList[idx];
    const {
      action,
      currTab
    } = (await this.onClick({
      type,
      help,
      index: idx,
      currTab: this.data.currTab,
    })) ?? {};
    if (currTab && currTab !== this.data.currTab) {
      this.setData({ currTab });
    }
    if (action === 'fetchSingle') {
      await this.fetchSingle(idx);
    } else if (action === 'fetchAll') {
      await this.reload();
    } else if (action === 'close') {
      wx.navigateBack();
    }
  },

  async onSwitchTab(ev) {
    if (this.data.isLoading) {
      return;
    }
    const { currentTarget: { dataset: { tabKey } } } = ev;
    this.setData({
      currTab: tabKey,
    });
    await this.reload();
  },

  onNavigateBack() {
    wx.navigateBack({})
  },


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  async onReachBottom() {
    await this.fetchMore();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})