const app = getApp()
const api = require("../../api/api")
const cache = require("../../cache/cache")
const MAX_COMMODITY_LIMIT_SIZE = 10
let res = {}
let params = {}
let uid = 0
let cid = -1
let start = 0
let categories = [{
  name: "全部",
  cid: -1
}]
let currCategory = ""

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
    universityName: "",
    regionPath: [],
    commodityList: [],
    start: 0,
    isLoading: false,
    hasMore: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    wx.showLoading({
      title: '加载中',
    })

    const { data: selfInfo } = await api.getSelfInfo();
    const { rid } = selfInfo;

    const { data: regions } = await api.getRegions() ?? [];
    const ridToRegion = {};
    for (const region of regions) {
      ridToRegion[region._id] = region;
    }
    let lastRegion = ridToRegion[rid];
    const regionPath = [];
    while (lastRegion !== undefined) {
      regionPath.push(lastRegion);
      lastRegion = ridToRegion[lastRegion.parents?.[0]];
    }
    console.log('calc region path', regionPath)
    this.setData({ regionPath });

    // res = await api.getCommodityListByRegion(selfInfo.rid);
    // console.log(res);
    // if (res.errno == -1) {
    //   console.log("获取商品列表失败！", res)
    //   return
    // }
    // this.setData({
    //   commodityList: res.data
    // })

    // params = {
    //   uid,
    //   start: 0,
    //   count: MAX_COMMODITY_LIMIT_SIZE,
    //   is_mine: false
    // }
    // res = await cache.getCommodityListByUidAndCid(params)
    // console.log(res);

    wx.hideLoading()
  },

  async onShow() {
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
      url: `../commodity_search/commodity_search?keyword=${keyword}`,
    })
  },

  // 标签页，切换分类
  async tabSelect(e) {
    wx.showLoading({
      title: '加载中',
    })
    const idx = e.currentTarget.dataset.id
    currCategory = this.data.categoryInfo[idx].name,
      this.setData({
        // TabCur: e.currentTarget.dataset.id,
        // scrollLeft: (e.currentTarget.dataset.id-1)*60,
        commodityList: [],
        currCategory,
      })
    cid = categories[idx].cid
    start = 0

    // 获取商品列表
    params = {
      uid,
      cid,
      keyword: "",
      start: start,
      count: MAX_COMMODITY_LIMIT_SIZE,
      is_mine: false
    }
    res = await cache.getCommodityListByUidAndCid(params)
    if (res.errno == -1) {
      console.log("获取商品列表失败！")
      return
    }
    const commodityList = res.data
    start = commodityList.length
    this.setData({
      commodityList,
      hasMore: true,
      isLoading: false
    })
    wx.hideLoading()
  },

  // 轮播图相关 cardSwiper
  // cardSwiper(e) {
  //   this.setData({
  //     cardCur: e.detail.current
  //   })
  // },

  // 刷新商品列表
  async onPullDownRefresh() {
    wx.showLoading({
      title: '加载中',
    })

    params = {
      uid,
      cid,
      keyword: "",
      start: 0,
      count: MAX_COMMODITY_LIMIT_SIZE,
      is_mine: false
    }
    res = await api.getCommodityListByUidAndCid(params)
    if (res.errno == -1) {
      console.log("刷新商品列表失败！")
      return
    }
    const commodityList = res.data
    start = commodityList.length

    params = {
      cid,
      commodityList
    }
    res = await cache.setCommodityListByCid(params)
    if (res.errno == -1) {
      console.log("新数据写入缓存失败")
      return
    }
    this.setData({
      commodityList,
      hasMore: true,
      isLoading: false
    })
    wx.hideLoading()
  },

  // 到底加载更多数据
  async onReachBottom() {

    if (!this.data.hasMore) {
      return
    }
    this.setData({
      isLoading: true
    })

    params = {
      uid,
      cid,
      keyword: "",
      start: start,
      count: MAX_COMMODITY_LIMIT_SIZE,
      is_mine: false
    }
    res = await api.getCommodityListByUidAndCid(params)
    if (res.errno == -1) {
      console.log("加载更多商品列表失败！")
      return
    }
    const moreCommodityList = res.data
    if (moreCommodityList.length == 0) {
      console.log("没有更多数据了！")
      this.setData({
        isLoading: false,
        hasMore: false
      })
      return
    }
    start += moreCommodityList.length
    const newCommodityList = this.data.commodityList.concat(moreCommodityList)
    params = {
      cid,
      commodityList: newCommodityList
    }
    res = await cache.setCommodityListByCid(params)
    if (res.errno == -1) {
      console.log("新数据写入缓存失败")
      return
    }
    this.setData({
      commodityList: newCommodityList
    })

  },


  async onEnterCommodityDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `../commodity_detail/commodity_detail?id=${id}&enteredFrom=1`,
    })
  },


  //底部Tab相关
  async onCommodityReleaseTab() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../commodity_release/commodity_release',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }

  },

  async onHomeTab() {
    wx.redirectTo({
      url: '../home/home',
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