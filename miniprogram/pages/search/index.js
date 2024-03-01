import api from "../../api/api";
import getConstants, { GENDER } from "../../constants";

const COUNT_PER_PAGE = 8
const app = getApp();

Page({
  data: {
    ...getConstants(),
    commodityList: [],
    cursor: 0,
    state: 'inputting', // inputting | loading | shown
    isFocused: true,
    text: '',

    self: app.globalData.self,
    onlyMyGender: false,

    histories: [],
  },

  fetchToken: 0,

  async onLoad() {
    const histories = wx.getStorageSync('searchHistories') ?? [];
    this.setData({
      self: app.globalData.self,
      histories,
    });
  },

  onFocus() {
    this.fetchToken++;
    this.setData({
      state: 'inputting',
    })
  },

  onInput(ev) {
    const { detail: { value } } = ev;
    this.setData({
      text: value
    });
  },

  async onConfirm() {
    const { text } = this.data;
    if (text.trim() === '') {
      this.setData({
        isFocused: true,
      })
      return;
    }
    const newHistories = [text, ...this.data.histories];
    if (newHistories.length > 10) {
      newHistories.splice(0, newHistories.length - 10);
    }
    this.setHistories(newHistories);
    await this.fetch(true);
  },

  async onHistoryClick(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const { histories } = this.data;
    const clicked = histories[idx];
    histories.splice(idx, 1);
    this.setHistories([clicked, ...histories]);
    this.setData({
      isFocused: false,
      text: clicked
    });
    await this.fetch(true);
  },
  async onHistoriesClear() {
    this.setData({ histories: [] });
    wx.removeStorageSync('searchHistories');
  },

  setHistories(histories) {
    this.setData({ histories });
    wx.setStorageSync('searchHistories', histories);
  },

  onOnlyMyGenderClick() {
    this.setData({ onlyMyGender: !this.data.onlyMyGender });
  },

  async fetch(clear) {
    if (clear) {
      this.fetchToken++;
      this.setData({
        commodityList: [],
        cursor: 0,
        state: 'loading',
      })
    }
    const token = this.fetchToken;
    const { text, cursor, commodityList } = this.data;
    const resp = await api.getCommodityList({
      keyword: text,
      orderBy: 'update_time',
      sex: this.data.onlyMyGender ? app.globalData.self.sex : GENDER.UNKNOWN,
      order: 'desc',
      start: cursor,
      count: COUNT_PER_PAGE,
    });
    if (resp.isError) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      });
      return;
    }
    if (token !== this.fetchToken) {
      console.log('fetch token mismatch, ignore fetch result')
      return;
    }
    const list = resp.data;
    if (list.length > 0) {
      this.setData({
        state: 'shown',
        cursor: cursor + list.length,
        commodityList: [...commodityList, ...list],
      })
    } else {
      this.setData({
        state: 'shown',
      })
    }
  },

  // 加载更多
  async onReachBottom() {
    if (this.data.state === 'shown') {
      await this.fetch(false);
    }
  },

  onBack() {
    const { state } = this.data;
    if (state === 'loading' || state === 'shown') {
      this.setData({
        state: 'inputting',
        text: '',
        isFocused: true,
      });
    } else if (state === 'inputting') {
      wx.navigateBack();
    }
  },

  onEnterCommodityDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `../commodity_detail/index?id=${id}`,
    })
  },
})