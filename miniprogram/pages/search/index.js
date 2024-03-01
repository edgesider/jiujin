import api from "../../api/api";
import getConstants from "../../constants";

const COUNT_PER_PAGE = 8

Page({
  data: {
    ...getConstants(),
    commodityList: [],
    cursor: 0,
    state: 'inputting', // inputting | loading | shown
    isFocused: false,
    text: '',
  },

  async onLoad(options) {
  },

  onFocus() {
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
    await this.fetch(true);
  },

  async fetch(clear) {
    if (clear) {
      this.setData({
        commodityList: [],
        cursor: 0,
        state: 'loading',
      })
    }
    const { text, cursor, commodityList } = this.data;
    const resp = await api.getCommodityList({
      keyword: text,
      orderBy: 'update_time',
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