import api from "../../api/api";
import getConstants, { COMMODITY_STATUS_SELLING, GENDER } from "../../constants";
import { getRegionPath, sleep } from "../../utils/other";
import { CommodityAPI } from "../../api/CommodityAPI";

const COUNT_PER_PAGE = 12
const MAX_HISTORIES = 10;
const app = getApp();

Page({
  data: {
    ...getConstants(),
    self: app.globalData.self,

    commodityList: [],
    cursor: 0,
    state: 'inputting', // inputting | loading | shown | error
    isFocused: true,
    text: '',

    histories: [],
    // 当前选择的区域过滤器
    regionFilter: null, // Region
    selectedRegionId: null,
    order: ['polish_time', 'desc'], // ['polish_time' | 'price', 'desc' | 'asc']
  },

  fetchToken: 0,

  async onLoad() {
    let histories = wx.getStorageSync('searchHistories') ?? [];
    if (!Array.isArray(histories)) {
      histories = [];
    }
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
    let text = this.data.text.trim();
    if (text === '') {
      return;
    }
    this.updateHistories(text);
    await this.fetch(true);
  },

  async onHistoryClick(ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const { histories } = this.data;
    const clicked = histories[idx];
    this.updateHistories(clicked)
    this.setData({
      isFocused: false,
      text: clicked
    });
    await this.fetch(true);
  },

  updateHistories(newValue) {
    this.setHistories(
      [newValue, ...this.data.histories.filter(h => h !== newValue)]
        .splice(0, MAX_HISTORIES)
    );
  },

  async onHistoriesClear() {
    this.setHistories([]);
  },

  setHistories(histories) {
    this.setData({ histories });
    wx.setStorageSync('searchHistories', histories);
  },

  async fetch(clear) {
    if (clear) {
      this.setData({
        commodityList: [],
        cursor: 0,
        state: 'loading',
      });
    } else {
      this.setData({
        state: 'loading'
      });
    }
    const token = ++this.fetchToken;
    const {
      text,
      cursor,
      commodityList,
      order: [orderBy, order],
      regionFilter,
    } = this.data;
    const resp = await CommodityAPI.search({
      keyword: text,
      orderBy,
      order,
      start: cursor,
      rid: regionFilter ? regionFilter._id : undefined,
      count: COUNT_PER_PAGE,
    });
    if (resp.isError) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      });
      if (clear) {
        this.setData({ state: 'error' });
      }
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

  onToggleTimeOrder() {
    this.toggleOrder('polish_time');
  },
  onTogglePriceOrder() {
    this.toggleOrder('price');
  },
  toggleOrder(order) {
    const { order: oldOrder } = this.data;
    const newOrder = [order, 'desc'];
    if (oldOrder[0] === order) {
      newOrder[1] = oldOrder[1] === 'desc' ? 'asc' : 'desc';
    }
    this.setData({
      order: newOrder
    });
    this.fetch(true);
  },
  async onRegionFilterClick() {
    const { self } = this.data;
    const path = getRegionPath(self.rid);
    const { tapIndex } = await wx.showActionSheet({
      itemList: [...path.map(p => p.name), '不限']
    })
    this.setData({
      regionFilter: path[tapIndex] ?? undefined
    });
    await this.fetch(true);
  },
})