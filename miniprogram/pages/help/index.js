import getConstants, { COMMODITY_STATUS_SELLING, DEFAULT_REGION_ID, HELP_STATUS_RUNNING } from "../../constants";
import { getRegionPath, setTabBar } from "../../utils/other";
import { buildShareParam, onShareHelp, parseShareInfo, reportShareInfo } from "../../utils/share";
import api, { getOpenId } from "../../api/api";
import { waitForAppReady } from "../../utils/globals";

const app = getApp()
const COUNT_PER_PAGE = 12

let needRefresh = false;

export function setNeedRefresh() {
  needRefresh = true;
}

Page({

  data: {
    ...getConstants(),
    scrollTop: 0,
    pageIndex: 0,
    searchInput: "",

    self: null,
    ridToRegion: null,
    // 可选的区域，按照层级排列L4、L3、L2、L1
    regions: [],
    selectedRegionIndex: 0, // 选中的区域

    helpList: [],
    cursor: 0,
    isLoading: false,
    pullDownRefreshing: false,

    banners: [],

    showRankingPopup: false,
    rankingPopupTop: 0,
    rankingOptions: [
      { key: 'bounty-asc', text: '悬赏由低到高' },
      { key: 'bounty-desc', text: '悬赏由高到低' },
      { key: 'polish_time-desc', text: '时间由近到远' },
      { key: 'polish_time-asc', text: '时间由远到近' },
    ],
    chosenRankingKey: 'polish_time-desc',

    onlyBounty: false,
  },
  initialized: false,
  fetchToken: 0,
  async onLoad(options) {
    setTabBar(this);

    const { shareInfo: shareInfoStr } = options;
    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }

    this.setData({
      isLoading: true,
    })
    try {
      await waitForAppReady();
      this.updateRegions();
      await this.fetchList();
      this.initialized = true;
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
    if (this.initialized && this.data.self?.rid !== app.globalData.self?.rid) {
      this.updateRegions();
      await Promise.all([this.fetchList()]);
    }
  },
  updateRegions() {
    const { self, ridToRegion } = app.globalData;
    const rid = self?.rid ?? DEFAULT_REGION_ID;

    const regionPath = getRegionPath(rid).reverse();
    if (self) {
      // 已登录
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
        regions: regionPath,
        selectedRegionIndex: 0,
      });
    }
  },
  async fetchList({ append } = {}) {
    console.log(`fetch: append=${append}, rid=${this.data.regions[this.data.selectedRegionIndex]._id}`);
    const rid = this.data.regions[this.data.selectedRegionIndex]._id;

    const start = append ? this.data.cursor : 0;
    const token = ++this.fetchToken;
    if (!append) {
      await wx.pageScrollTo({ scrollTop: 0, smooth: true });

    }
    const oldList = this.data.helpList;
    this.setData({
      cursor: start,
      isLoading: true,
      helpList: append ? oldList : [],
    });
    try {
      const [orderBy, order] =
        this.data.onlyBounty
          ? ['bounty', 'desc']
          : ['polish_time', 'desc'];
      const resp = await api.getHelpList({
        rid, status: HELP_STATUS_RUNNING,
        start, count: COUNT_PER_PAGE,
        order_by: orderBy, order,
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
      if (append && oldList.length !== this.data.helpList.length) {
        console.log('list changed, ignore result');
        return;
      }
      const data = append ? oldList.concat(resp.data) : resp.data;
      const cursor = data.length;
      this.setData({
        isLoading: false,
        cursor,
        helpList: data,
      });
    } catch (e) {
      console.error(e);
    }
  },
  async toggleOnlyBounty() {
    this.setData({
      onlyBounty: !this.data.onlyBounty,
    });
    await this.fetchList();
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

  async onRegionClick(ev) {
    this.setData({
      selectedRegionIndex: ev.detail.index,
    }, async () => {
      await this.fetchList();
    });
  },

  async onRegionSwitchClick(ev) {
    this.setData({
      selectedRegionIndex: ev.currentTarget.dataset.idx,
    }, async () => {
      await this.fetchList({ scrollToTop: true });
    });
  },

  onShareAppMessage(options) {
    return onShareHelp(options)
  },
})