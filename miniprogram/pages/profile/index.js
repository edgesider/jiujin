import getConstants, { COMMODITY_STATUS_SELLING, COMMODITY_STATUS_SOLD } from "../../constants";
import api from "../../api/api";
import moment from "moment";
import { getRegionPathName } from "../../utils/other";
import { CommodityAPI } from "../../api/commodity";

const app = getApp()
const COUNT_PER_PAGE = 12

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
    currFilter: 'selling',
    cursor: 0,
    commodityList: [],
    listLoading: false,
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
    this.setData({
      userLoadState: 'loaded',
      user,
      regionName: getRegionPathName(user.rid, 2),
      lastSeenTime: !user.last_seen_time ? '很久前' : moment(user.last_seen_time).fromNow(),
    });
  },

  async fetchList(append = false) {
    console.log('fetch', this.data.currFilter);
    if (!append) {
      this.setData({
        cursor: 0,
        commodityList: [],
        listLoading: true
      });
    } else {
      this.setData({
        listLoading: true
      });
    }
    const resp = await CommodityAPI.listByUser({
      ...this.getApiParams(),
      start: this.data.cursor,
      count: COUNT_PER_PAGE,
    });
    if (resp.isError) {
      await wx.showToast({ title: '网络错误' })
      return;
    }
    const list = resp.data ?? [];
    const newList = append ? [...this.data.commodityList, ...list] : list;
    this.setData({
      cursor: newList.length,
      commodityList: newList,
      listLoading: false,
    })
  },

  onReachBottom() {
    this.fetchList(true);
  },

  getApiParams() {
    const { currFilter, user: { _id: uid } } = this.data;
    if (currFilter === 'all') {
      return { uid, };
    } else if (currFilter === 'selling') {
      return { uid, status: COMMODITY_STATUS_SELLING };
    } else if (currFilter === 'sold') {
      return { uid, status: COMMODITY_STATUS_SOLD };
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