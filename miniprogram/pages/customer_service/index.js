import api from "../../api/api";
import getConstants from "../../constants";
import moment from 'moment';
import { setTabBar } from "../../utils/other";

const app = getApp();
const COUNT_PER_PAGE = 12

Page({
  data: {
    ...getConstants(),
    cursor: 0,
    isLoading: false,
    commodityList: [],
    pageIndex: 3,
    ridToRegion: null,
  },

  async onLoad() {
    setTabBar(this);
    await app.waitForReady();

    await this.fetchMore();
  },

  onEnter(res) {
    const idx = res.currentTarget.dataset.idx;
    const commodity = this.data.commodityList[idx];
    const id = commodity._id;
    const desc = commodity.content;
    const { self } = app.globalData;
    const user_id = 'REPY' + self._id + id;
    app.globalData.config.commodity = commodity;
    wx.$TUIKit.updateMyProfile({
      nick: self.name + '-' + desc,
      avatar: self.avatar_url,
      gender: self.sex == 0 ? wx.TencentCloudChat.TYPES.GENDER_MALE : wx.TencentCloudChat.TYPES.GENDER_FEMALE,
      allowType: wx.TencentCloudChat.TYPES.ALLOW_TYPE_ALLOW_ANY
    }).then((imResponse) => {
      console.log(imResponse.data); // 更新资料成功
    }).catch((imError) => {
      console.warn('更新个人资料错误： ', imError); // 更新资料失败的相关信息
    });
    app.globalData.currentUser = user_id;
    wx.switchTab({
      url: `../../TUIService/pages/tim_index/tim_index`,
    });
  },

  async fetchMore() {
    if (this.data.isLoading) {
      return;
    }
    this.setData({
      isLoading: true,
    })
    const resp = await api.getCommodityList({
      // 不需要status过滤
      seller_id: app.globalData.self._id,
      start: this.data.cursor,
      count: COUNT_PER_PAGE,
    })
    if (resp.isError) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
        mask: true,
        isLoading: false,
      })
      return;
    }
    const { data } = resp;
    for (var i = 0; i < data.length; i++) {
      data[i].status = null;
      data[i].create_time = new Date(data[i].create_time).toLocaleDateString();
      data[i].update_time = moment(data[i].update_time).fromNow();
    }
    this.setData({
      commodityList: this.data.commodityList.concat(data),
      cursor: this.data.cursor + data.length,
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

  // 加载更多
  async onReachBottom() {
    await this.fetchMore();
  },

  async onPullDownRefresh() {
    await this.reload();
    await wx.stopPullDownRefresh();
  },

  onNavigateBack() {
    wx.navigateBack({
      delta: 1
    })
  },
})