import getConstants from "../../constants";
import { CommodityAPI } from "../../api/CommodityAPI";
import { sleep } from "../../utils/other";
import { HelpAPI } from "../../api/HelpAPI";

const app = getApp();
const COUNT_PER_PAGE = 12

Page({
  data: {
    ...getConstants(),
    pullDownRefreshing: false,
    isLoading: true,
    cursor: 0,
    itemList: [],
    listType: 'commodity', // commodity | help
    showStatusImage: true,

    title: '',
    currTab: '',
    tabs: [],
  },
  fetcher: async () => {},
  onClick: async () => {},
  fetchToken: 0,
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
        await this.fetch();
      });
  },

  async fetch(clear = false) {
    const token = ++this.fetchToken;
    this.setData({ isLoading: true, });
    if (clear) {
      this.setData({ itemList: [], cursor: 0 });
    }
    const res = await this.fetcher({
      start: this.data.cursor,
      count: COUNT_PER_PAGE,
      currTab: this.data.currTab,
    });
    if (token !== this.fetchToken) {
      return;
    }
    const { list, listType, showStatusImage } = res ?? {};
    if (!res || res instanceof Error || !Array.isArray(list) || ['commodity', 'help'].indexOf(listType) === -1) {
      console.error(res);
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
        mask: true,
        isLoading: false,
      })
      this.setData({
        isLoading: false,
      })
      return;
    }
    this.setData({
      itemList: this.data.itemList.concat(list),
      listType,
      cursor: this.data.cursor + list.length,
      isLoading: false,
      showStatusImage
    })
  },

  async fetchSingle(idx) {
    const { listType } = this.data;
    const item = this.data.itemList[idx];
    const resp = listType === 'commodity'
      ? await CommodityAPI.getOne(item._id)
      : await HelpAPI.getOne(item._id);
    if (resp.isError) {
      return;
    }
    this.data.itemList[idx] = resp.data;
    this.setData({
      itemList: this.data.itemList
    });
  },

  async reload() {
    this.setData({
      cursor: 0,
      itemList: [],
    });
    await this.fetch();
  },

  async onRefresherRefresh() {
    this.setData({ pullDownRefreshing: true, })
    await this.fetch(true);
    await sleep(500);
    this.setData({ pullDownRefreshing: false, })
  },

  async onReachBottom() {
    await this.fetch();
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
    const { itemList, listType } = this.data;
    const item = itemList[idx];
    const { action, currTab } = (await this.onClick({
      type,
      item,
      listType,
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
      await wx.navigateBack();
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