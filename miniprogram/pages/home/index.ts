import { getRegionPath, setTabBar } from '../../utils/other';
import getConstants, { COMMODITY_STATUS_SELLING, DEFAULT_REGION_ID } from '../../constants';
import api, { getOpenId } from '../../api/api';
import { buildShareParam, parseShareInfo, reportShareInfo } from '../../utils/share';
import { Commodity, Region, User } from '../../types';

type TouchEvent = WechatMiniprogram.TouchEvent;
const app = getApp();
const COUNT_PER_PAGE = 12;

let needRefresh = false;

export function setNeedRefresh() {
  needRefresh = true;
}

Page({
  data: {
    ...getConstants(),
    scrollTop: 0,

    self: null as User | null,
    // 可选的区域，按照层级排列L4、L3、L2、L1
    regions: [] as Region[],
    selectedRegionIndex: 0, // 选中的区域

    commodityList: [] as Commodity[],
    cursor: 0,
    isLoading: false,
    pullDownRefreshing: false,

    banners: [],

    showRankingPopup: false,
    rankingPopupTop: 0,
    rankingOptions: [
      { key: 'polish_time-desc', text: '时间由近到远' },
      { key: 'polish_time-asc', text: '时间由远到近' },
      { key: 'price-asc', text: '价格由低到高' },
      { key: 'price-desc', text: '价格由高到低' },
    ],
    chosenRankingKey: 'polish_time-desc',
  },
  initialized: false,
  fetchToken: 0,

  async onLoad(options) {
    console.log('onLoad', options);
    setTabBar(this);

    const { shareInfo: shareInfoStr } = options;
    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }
    await this.init();
  },
  async init() {
    this.setData({ isLoading: true })
    try {
      await app.waitForReady();
      this.updateRegions();
      await this.loadBanners();
      this.initialized = true;

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
  async onClickLogo() {
    const bookingRequestTmpId = 'QMlQmIOyZo90Tc9stZYHO8a8tWuG4J6jK8PI4hGy5MQ';
    const bookingSucceedTmpId = 'w_NyXTO4HoEMU3kY4u3ngfPnBnwYQ8eQ9iJykU19-Lg';
    const res = await wx.requestSubscribeMessage({
      tmplIds: [bookingRequestTmpId, bookingSucceedTmpId]
    });
    if (res[bookingRequestTmpId] !== 'accept') {
      await wx.showToast({
        title: '发起预定被拒绝'
      });
    }
    if (res[bookingSucceedTmpId] !== 'accept') {
      await wx.showToast({
        title: '预定成功被拒绝'
      });
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
    const { self } = app.globalData;
    const rid = self?.rid ?? DEFAULT_REGION_ID;

    const regionPath = getRegionPath(rid).reverse();
    if (self) {
      // 已登录
      this.setData({
        self,
        regions: regionPath,
        selectedRegionIndex: 0,
      });
    } else {
      // 未登录，展示默认的区域
      this.setData({
        self,
        regions: regionPath,
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

  async fetchList({ append }: { append?: boolean } = {}) {
    if (!this.initialized) {
      await this.init();
      return;
    }
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
      const [orderBy, order] = this.data.chosenRankingKey.split('-');
      const resp = await api.getCommodityList({
        rid, is_mine: false, status: COMMODITY_STATUS_SELLING,
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

  async onSearchClick() {
    wx.navigateTo({
      url: `../search/index`,
    })
  },

  async onRegionClick(ev: TouchEvent) {
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

  onClickBanner(ev: TouchEvent) {
    const { url } = ev.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.banners.map((b: any) => b.url),
    })
  },

  onToggleRankingSwitch() {
    if (this.data.showRankingPopup) {
      this.setData({
        showRankingPopup: false,
      });
      return;
    }
    wx.createSelectorQuery()
      .select('#ranking-switch')
      .boundingClientRect(res => {
        const top = res.top + 42;
        this.setData({
          showRankingPopup: true,
          rankingPopupTop: top,
        })
      })
      .exec();
  },

  onRankingKeyChanged(event: TouchEvent) {
    const { rankingKey } = event.currentTarget.dataset;
    this.setData({
      showRankingPopup: false,
      chosenRankingKey: rankingKey
    });
    this.fetchList();
  },

  onShareAppMessage(options) {
    const shareInfo = buildShareParam({
      type: 'app',
      from: options.from,
      fromUid: getOpenId(),
      timestamp: Date.now(),
      method: 'card'
    });
    return {
      title: '闲置买卖，又近又快',
      path: `/pages/home/index?shareInfo=${encodeURIComponent(shareInfo)}`
    }
  },
})