import { setTabBar } from "../../utils/other";
import { COMMODITY_STATUS_SELLING } from '../../constants';
import Dialog from '@vant/weapp/dialog/dialog';
import { getQualitiesMap } from "../../utils/strings";
import api from "../../api/api";

const app = getApp()
const SIZE_PER_PAGE = 8
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
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
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
    qualitiesMap: getQualitiesMap(),

    cursor: 0,
    isLoading: false,
    hasMore: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    setTabBar(this);
    this.setData({ isLoading: true })
    try {
      await this.loadRegions(); // TODO cache
      await this.fetchList();
    } catch (e) {
      Dialog.alert({ message: e, });
      console.error(e);
    } finally {
      this.setData({ isLoading: false })
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
  },

  async loadRegions() {
    await app.waitForReady();
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

  async fetchList({ append } = {}) {
    const rid = this.data.regions[this.data.selectedRegionIndex]._id;

    const start = append ? this.data.cursor : 0;
    if (!append) {
      wx.pageScrollTo({ scrollTop: 0, smooth: true });
    }
    this.setData({
      cursor: start,
      isLoading: true,
      commodityList: append ? this.data.commodityList : [],
      hasMore: true,
    });
    try {
      const list = await api.getCommodityList(rid, {
        start,
        count: SIZE_PER_PAGE,
        is_mine: false,
        status: COMMODITY_STATUS_SELLING
      });
      const data = append ? this.data.commodityList.concat(list.data) : list.data;
      const hasMore = list.data.length !== 0;
      const cursor = data.length;
      this.setData({
        isLoading: false,
        hasMore,
        cursor,
        commodityList: data,
      });
    } catch (e) {
      console.error(e);
    } finally {
      if (this.data.isLoading) {
        this.setData({
          isLoading: false,
        })
      }
    }
  },

  async loadMore() {
    await this.fetchList({ append: true });
  },

  async refreshCurrentTab() {
    await this.fetchList();
  },

  // 刷新商品列表
  async onPullDownRefresh() {
    await this.fetchList();
    await wx.stopPullDownRefresh();
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

  // 搜索
  async onSearchCommodity(event) {
    const keyword = event.detail.value
    wx.navigateTo({
      url: `../search/index?keyword=${keyword}`,
    })
  },

  // 切换区域
  async onChangeRegion(ev) {
    const targetIdx = ev.currentTarget.dataset.idx;
    if (typeof targetIdx !== 'number' || targetIdx === this.data.selectedRegionIndex) {
      return;
    }
    this.setData({
      selectedRegionIndex: targetIdx,
    }, async () => {
      await this.fetchList();
    });
  },

  async onEnterCommodityDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `../commodity_detail/index?id=${id}&enteredFrom=1`,
    })
  },

  async onCommodityReleaseTab() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../commodity_publish/index',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }

  },

  async onHomeTab() {
    wx.redirectTo({
      url: '../me/index',
    })
  },

  onShowLoginPopup() {
    const registered = app.globalData.registered
    if (!registered) {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  onTitleClick() {
  },

  onCancelLoginPopup() {
    this.setData({
      showLoginPopup: false
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
})