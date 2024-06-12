import { cloudProtocolToHttp, getRegionPath, setTabBar } from '../../utils/other';
import getConstants, { DEFAULT_REGION_ID } from '../../constants';
import api, { getOpenId } from '../../api/api';
import { buildShareParam, parseShareInfo, reportShareInfo } from '../../utils/share';
import { Banner, Commodity, Region, User } from '../../types';
import { getGlobals, waitForAppReady } from '../../utils/globals';
import { RegionClickEvent } from '../../components/RegionFilter';
import { CommodityAPI } from '../../api/CommodityAPI';
import { Resp } from '../../api/resp';
import { getEnvVersion } from '../../utils/env';
import { processSchema } from '../../utils/router';

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

    self: null as User | null,
    // 可选的区域，按照层级排列L4、L3、L2、L1
    regions: [] as Region[],
    selectedRegionIndex: 0, // 选中的区域

    commodityList: [] as Commodity[],
    cursor: Date.now(),
    isLoading: false,
    pullDownRefreshing: false,

    banners: [] as Banner[],

    showRankingPopup: false,
    rankingPopupTop: 0,
    rankingOptions: [
      { key: 'polish_time-desc', text: '时间由近到远' },
      { key: 'polish_time-asc', text: '时间由远到近' },
      { key: 'price-asc', text: '价格由低到高' },
      { key: 'price-desc', text: '价格由高到低' },
    ],
    chosenRankingKey: 'polish_time-desc',

    scrollIntoView: null as string | null,
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
    await this.init();
  },
  async init() {
    this.setData({ isLoading: true })
    try {
      await waitForAppReady();
      this.setData({ self: app.globalData.self, });
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
    if (getEnvVersion() === 'develop') {
      await wx.openSetting({});
    }
  },

  async onShow() {
    if (needRefresh) {
      needRefresh = false;
      await this.fetchList();
    }
    if (this.initialized && this.data.self?.rid !== getGlobals().self?.rid) {
      this.updateRegions();
      await Promise.all([this.fetchList(), this.loadBanners()]);
    }
  },

  updateRegions() {
    const { self } = app.globalData;
    const rid = self?.rid ?? DEFAULT_REGION_ID;

    const regionPath = getRegionPath(rid).reverse();
    this.setData({
      regions: regionPath,
      selectedRegionIndex: 0,
    });
  },

  async loadBanners() {
    const rid = app.globalData.self?.rid ?? DEFAULT_REGION_ID;
    const resp: Resp<Banner[]> = await api.getBannerList(rid);
    if (resp.isError || !resp.data) {
      console.error(resp);
      return;
    }
    const banners = resp.data.map(b =>
      ({ ...b, url: cloudProtocolToHttp(b.url) }));
    this.setData({ banners });
  },

  async fetchList({ append, scrollToTop }: { append?: boolean, scrollToTop?: boolean } = {}) {
    if (!this.initialized) {
      await this.init();
      return;
    }
    console.log(`fetch: append=${append}, rid=${this.data.regions[this.data.selectedRegionIndex]._id}`);
    const rid = this.data.regions[this.data.selectedRegionIndex]._id;
    const [orderBy, order] = this.data.chosenRankingKey.split('-');
    const useStreamTime = orderBy === 'polish_time' && order === 'desc';

    let cursor = append ? this.data.cursor : (useStreamTime ? Date.now() : 0);
    const token = ++this.fetchToken;
    if (!append) {
      this.loadBanners().then();
    }
    const oldList = this.data.commodityList;
    this.setData({
      cursor,
      isLoading: true,
      scrollIntoView: null,
    });
    try {
      const resp = useStreamTime
        ? await CommodityAPI.getCommodities({
          rid, count: COUNT_PER_PAGE,
          order, orderBy,
          streamTime: cursor
        })
        : await CommodityAPI.getCommodities({
          rid, count: COUNT_PER_PAGE,
          order, orderBy,
          start: cursor,
        });
      if (resp.isError || !resp.data) {
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
      const newList = append ? oldList.concat(resp.data) : resp.data;
      const newCursor = useStreamTime
        ? newList[newList.length - 1]?.polish_time ?? Date.now()
        : newList.length;
      this.setData({
        isLoading: false,
        cursor: newCursor,
        commodityList: newList,
        scrollIntoView: scrollToTop ? 'top' : null,
      });
    } catch (e) {
      console.error(e);
    }
  },

  async loadMore() {
    await this.fetchList({ append: true });
  },

  async refreshCurrentTab() {
    await this.fetchList({ scrollToTop: true });
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

  async onRegionClick(ev: RegionClickEvent) {
    this.setData({
      selectedRegionIndex: ev.detail.index,
    }, async () => {
      await this.fetchList({ scrollToTop: true });
    });
  },

  async onRegionSwitchClick(ev: TouchEvent) {
    this.setData({
      selectedRegionIndex: ev.currentTarget.dataset.idx,
    }, async () => {
      await this.fetchList({ scrollToTop: true });
    });
  },

  async onClickBanner(ev: TouchEvent) {
    const banner = ev.currentTarget.dataset.banner as Banner;
    if (banner.schema) {
      await processSchema(banner.schema);
    } else if (banner.page_path) {
      await wx.navigateTo({ url: banner.page_path, });
    } else {
      await wx.previewImage({
        current: banner.url,
        urls: this.data.banners.map((b: any) => b.url),
      })
    }
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
      path: `/pages/home/index?shareInfo=${encodeURIComponent(shareInfo)}`,
      // imageUrl: drawCommodityShareImage(),
    }
  },

  // onShareTimeline() {
  //   const shareInfo = buildShareParam({
  //     type: 'app',
  //     from: 'menu',
  //     fromUid: getOpenId(),
  //     timestamp: Date.now(),
  //     method: 'card'
  //   });
  //   return {
  //     title: '闲置买卖，又近又快',
  //     path: `/pages/home/index?shareInfo=${encodeURIComponent(shareInfo)}`,
  //     imageUrl: 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_bounty.png?sign=cf7bf85968fa8ea87c072475eee3be64'
  //   }
  // }
})