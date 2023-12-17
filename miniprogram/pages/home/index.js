const app = getApp()
const api = require("../../api/api")
const { getQualitiesMap } = require("../../utils/strings");
const SIZE_PER_PAGE = 10
import Dialog from '@vant/weapp/dialog/dialog';

let needRefresh = false;
module.exports.setNeedRefresh = () => {
  needRefresh = true;
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
    showLoginPopup: false,
    pageIndex: 0,
    searchInput: "",

    ridToRegion: null,
    regions: [],
    selectedRegionIndex: 0, // 选中的区域

    commodityList: [],
    commodityListRows: [],

    qualitiesMap: getQualitiesMap(),

    start: 0,
    isLoading: false,
    hasMore: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    await wx.showLoading({ title: '加载中', })

    try {
      await this.loadRegions();
      await this.refreshList(undefined, false);
    } catch (e) {
      Dialog.alert({
        message: e,
      });
      console.error(e);
    } finally {
      await wx.hideLoading();
    }
  },

  async onShow() {
    if (needRefresh) {
      needRefresh = false;
      await this.refreshList(undefined, true);
    }
  },

  async loadRegions() {
    const { data: selfInfo } = await api.getSelfInfo();
    if (!selfInfo || !selfInfo._id) {
      throw Error('未登录');
    }
    const { rid } = selfInfo;

    const { data: regions } = await api.getRegions() ?? [];
    const ridToRegion = {};
    for (const region of regions) {
      ridToRegion[region._id] = region;
    }
    app.globalData.ridToRegion = ridToRegion;

    let lastRegion = ridToRegion[rid];
    const regionPath = []; // 自己所在的区域，以及所有父区域
    while (lastRegion !== undefined) {
      regionPath.push(lastRegion);
      lastRegion = ridToRegion[lastRegion.parents?.[0]];
    }
    this.setData({
      ridToRegion,
      regions: regionPath,
      selectedRegionIndex: 0,
    });
  },

  async refreshList(rid, loading) {
    if (rid === undefined) {
      rid = this.data.regions[this.data.selectedRegionIndex]._id;
    }
    loading = Boolean(loading);

    if (loading) {
      await wx.showLoading({ mask: true });
    }
    try {
      const list = await api.getCommodityList(rid, {
        start: 0,
        count: SIZE_PER_PAGE,
        is_mine: false,
        status: 0 // TODO enum
      });
      console.log(`commodity for rid=${rid}`, list.data);
      this.setListData(list.data);
    } catch (e) {
      console.error(e);
    } finally {
      wx.hideLoading()
    }
  },

  setListData(commodityList) {
    // const first = commodityList.data[0];
    // commodityList = [...new Array(40)].map(() => first);
    this.setData({
      commodityList,
      commodityListRows: this.splitListToRows(commodityList)
    });
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
    this.setData({ selectedRegionIndex: targetIdx }, () => {
      this.refreshList(undefined, true);
    });
  },

  // 刷新商品列表
  async onPullDownRefresh() {
    await this.refreshList(undefined, true);
    await wx.stopPullDownRefresh();
  },

  // 到底加载更多数据
  async onReachBottom() {
    // TODO 分页
  },

  async onEnterCommodityDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `../commodity_detail/index?id=${id}&enteredFrom=1`,
    })
  },


  //底部Tab相关
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
    console.log('click')
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
      url: '../index_register/index_register',
    })

  },
})