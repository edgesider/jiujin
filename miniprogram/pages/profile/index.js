import getConstants, { COMMODITY_STATUS_SELLING, COMMODITY_STATUS_SOLD } from "../../constants";
import api from "../../api/api";
import moment from "moment";

const app = getApp()

Page({
  data: {
    ...getConstants(),
    user: null,
    userLoadState: 'loading', // loading | loaded | error
    filters: [
      { key: 'all', name: '全部' },
      { key: 'selling', name: '出售中' },
      { key: 'sold', name: '已售出' },
    ],
    currFilter: 'all',
    commodityList: [],
  },

  async onLoad(options) {
    const { user_id } = options;
    await this.fetchUser(user_id);
    await this.fetchList();
  },

  async fetchUser(uid) {
    const resp = await api.getUserInfo(uid);
    if (resp.isError) {
      this.setData({ userLoadState: 'error' });
      console.log('user load failed', resp);
      return;
    }
    const user = resp.data;
    const { ridToRegion } = app.globalData;
    const regionPath = [];
    for (
      let region = ridToRegion[user.rid];
      Boolean(region);
      region = region.parents[0] ? ridToRegion[region.parents[0]] : null
    ) {
      regionPath.push(region);
    }
    const regionName = regionPath.reverse().map(r => r.name).join('/');
    this.setData({
      userLoadState: 'loaded',
      user,
      regionName,
      lastSeenTime: !user.lastSeenTime ? '很久前' : moment(user.lastSeenTime).fromNow(),
    });
  },

  async fetchList(append = false) {
    console.log('fetch', this.data.currFilter);
    if (!append) {
      this.setData({
        commodityList: [],
      });
    }
    const resp = await api.getCommodityList(this.getApiParams());
    if (resp.isError) {
      await wx.showToast({ title: '网络错误' })
      return;
    }
    const list = resp.data ?? [];
    const newList = append ? [...this.data.commodityList, ...list] : list;
    this.setData({
      commodityList: newList,
    })
  },

  getApiParams() {
    const { currFilter, user: { _id: uid } } = this.data;
    if (currFilter === 'all') {
      return { sell_id: uid, };
    } else if (currFilter === 'selling') {
      return { sell_id: uid, status: COMMODITY_STATUS_SELLING };
    } else if (currFilter === 'sold') {
      return { sell_id: uid, status: COMMODITY_STATUS_SOLD };
    }
  },

  async onChangeFilter(ev) {
    const { currentTarget: { dataset: { key } } } = ev;
    this.setData({
      currFilter: key,
    });
    await this.fetchList(false);
  },

  onClickCommodity() {
  },
})