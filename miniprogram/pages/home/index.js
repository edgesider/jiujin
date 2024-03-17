import { setTabBar } from "../../utils/other";
import getConstants, { COMMODITY_STATUS_SELLING } from '../../constants';
import api from '../../api/api';

const app = getApp()
const COUNT_PER_PAGE = 12
const DEFAULT_REGION_ID = 1

let needRefresh = false;

export function setNeedRefresh() {
  needRefresh = true;
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    ...getConstants(),
    scrollTop: 0,
    showLoginPopup: false,
    pageIndex: 0,
    searchInput: "",

    self: null,
    ridToRegion: null,
    // 可选的区域，按照层级排列L4、L3、L2、L1
    regions: [],
    selectedRegionIndex: 0, // 选中的区域

    commodityList: [],
    cursor: 0,
    isLoading: false,
    pullDownRefreshing: false,

    banners: [],
  },

  fetchToken: 0,

  async onLoad() {
    setTabBar(this);
    this.setData({ isLoading: true })
    try {
      await app.waitForReady();
      this.updateRegions();
      await this.loadBanners();
      await this.fetchList();
    } catch (e) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      });
      console.error(e);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  onPageScroll(options) {
    const { scrollTop } = options;
    this.setData({ scrollTop });
  },

  async onShow() {
    if (needRefresh) {
      needRefresh = false;
      await this.fetchList();
    }
    if (this.data.self?.rid !== app.globalData.self?.rid) {
      this.updateRegions();
      await Promise.all([this.fetchList(), this.loadBanners()]);
    }
  },

  updateRegions() {
    const { self, ridToRegion } = app.globalData;
    if (self) {
      // 已登录
      const { rid } = self;

      let lastRegion = ridToRegion[rid];
      const regionPath = []; // 自己所在的区域，以及所有父区域
      while (lastRegion !== undefined) {
        regionPath.push(lastRegion);
        lastRegion = ridToRegion[lastRegion.parents?.[0]];
      }
      this.setData({
        self,
        ridToRegion,
        regions: regionPath,
        selectedRegionIndex: 0,
      });
    } else {
      // 未登录，展示默认的区域
      this.setData({
        self,
        ridToRegion,
        regions: [ridToRegion[DEFAULT_REGION_ID]],
        selectedRegionIndex: 0,
      });
    }
  },

  async loadBanners() {
    const rid = app.globalData.self?.rid ?? DEFAULT_REGION_ID;
    const resp = await api.getBannerList(rid);
    if (resp.isError) {
      console.error(resp);
      return;
    }
    this.setData({
      banners: resp.data,
    });
  },

  async fetchList({ append } = {}) {
    console.log(`fetch: append=${append}, rid=${this.data.regions[this.data.selectedRegionIndex]._id}`);
    const rid = this.data.regions[this.data.selectedRegionIndex]._id;

    const start = append ? this.data.cursor : 0;
    const token = ++this.fetchToken;
    if (!append) {
      await wx.pageScrollTo({ scrollTop: 0, smooth: true });
      this.loadBanners().then();
    }
    const oldList = this.data.commodityList;
    this.setData({
      cursor: start,
      isLoading: true,
      commodityList: append ? oldList : [],
    });
    try {
      const resp = await api.getCommodityList({
        rid,
        start,
        count: COUNT_PER_PAGE,
        is_mine: false,
        status: COMMODITY_STATUS_SELLING
      });
      if (resp.isError) {
        await wx.showToast({ title: '网络错误' })
        return;
      }
      if (token !== this.fetchToken) {
        console.log(`fetch token mismatch, ignore result: required=${token}, actual=${this.fetchToken}`);
        return;
      }
      if (rid !== this.data.regions[this.data.selectedRegionIndex]._id) {
        console.log('rid mismatch, ignore result');
        return;
      }
      if (append && oldList.length !== this.data.commodityList.length) {
        console.log('list changed, ignore result');
        return;
      }
      const data = append ? oldList.concat(resp.data) : resp.data;
      const cursor = data.length;
      this.setData({
        isLoading: false,
        cursor,
        commodityList: data,
      });
    } catch (e) {
      console.error(e);
    }
  },

  async loadMore() {
    await this.fetchList({ append: true });
  },

  async refreshCurrentTab() {
    await this.fetchList();
  },

  async onRefresherRefresh() {
    this.setData({ pullDownRefreshing: true, })
    await this.fetchList();
    this.setData({ pullDownRefreshing: false, })
  },

  async onReachBottom() {
    await this.loadMore();
  },

  splitListToRows(list) {
    const rows = [];
    for (let i = 0; i < list.length; i += 2) {
      rows.push(list.slice(i, i + 2));
    }
    return rows;
  },

  // 表单
  onSearchInput(event) {
    this.setData({
      searchInput: event.detail.value
    })
  },

  async onSearchClick() {
    wx.navigateTo({
      url: `../search/index`,
    })
  },

  async onRegionClick(ev) {
    const targetIdx = ev.currentTarget.dataset.idx;
    if (typeof targetIdx !== 'number') {
      return;
    }
    this.setData({
      selectedRegionIndex: targetIdx,
    }, async () => {
      await this.fetchList();
    });
  },

  onClickBanner(ev) {
    const { url } = ev.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.banners.map(b => b.url),
    })
  },

  async onEnterCommodityDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `../commodity_detail/index?id=${id}&enteredFrom=1`,
    })
  },

  // 用户注册
  async onAuth(event) {
    const userInfo = event.detail.userInfo
    console.log(userInfo)
    wx.setStorageSync('userInfo', userInfo)
    this.setData({
      showLoginPopup: false
    })
    wx.redirectTo({
      url: '../register/index',
    })
  },

  onShareAppMessage(options) {
    return {
      title: '找到一个好用的小程序，快来看看吧！',
      path: '/pages/home/index.ts'
    }
  },
})