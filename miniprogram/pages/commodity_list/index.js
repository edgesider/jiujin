import api from "../../api/api";
import getConstants from "../../constants";

const app = getApp();
const COUNT_PER_PAGE = 12

Page({
  data: {
    ...getConstants(),
    pullDownRefreshing: false,
    isLoading: false,
    cursor: 0,
    commodityList: [],

    title: '',
    currTab: '',
    tabs: [],
  },
  fetcher: async () => ({}),
  onClick: () => {},
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
      commodityList: this.data.commodityList.concat(res),
      cursor: this.data.cursor + res.length,
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

  async onRefresherRefresh() {
    this.setData({ pullDownRefreshing: true, })
    await this.fetchMore();
    this.setData({ pullDownRefreshing: false, })
  },

  async onReachBottom() {
    await this.fetchMore();
  },

  async onClickCard(ev) {
    await this.processClick('click-card', ev);
  },
  async onPolish(ev) {
    await this.processClick('polish', ev);
  },
  // 下架
  async onDeactivate(ev) {
    await this.processClick('deactivate', ev);
  },
  // 重新上架
  async onActivate(ev) {
    await this.processClick('activate', ev);
  },
  async onEdit(ev) {
    await this.processClick('edit', ev);
  },
  async onDelete(ev) {
    await this.processClick('delete', ev);
  },
  async onRepublish(ev) {
    await this.processClick('republish', ev);
  },
  async processClick(type, ev) {
    const { currentTarget: { dataset: { idx } } } = ev;
    const commodity = this.data.commodityList[idx];
    const {
      action,
      currTab
    } = (await this.onClick({
      type,
      commodity,
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
})