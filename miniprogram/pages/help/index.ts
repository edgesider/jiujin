import getConstants, { DEFAULT_REGION_ID } from '../../constants';
import { ensureVerified, getRegionPath, setTabBar } from '../../utils/other';
import { onShareApp, onShareHelp, parseShareInfo, reportShareInfo } from '../../utils/share';
import { waitForAppReady } from '../../utils/globals';
import { HelpAPI } from '../../api/HelpAPI';
import { Help, Region, User } from '../../types';

type TouchEvent = WechatMiniprogram.TouchEvent;

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

    self: null as User | null,
    // 可选的区域，按照层级排列L4、L3、L2、L1
    regions: [] as Region[],
    selectedRegionIndex: 0, // 选中的区域

    helpList: [] as Help[],
    cursor: Date.now(),
    isLoading: false,
    pullDownRefreshing: false,
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
  async fetchList({ append }: { append?: boolean } = {}) {
    console.log(`fetch: append=${append}, rid=${this.data.regions[this.data.selectedRegionIndex]._id}`);
    const rid = this.data.regions[this.data.selectedRegionIndex]._id;
    const useStreamTime = true;

    const cursor = append ? this.data.cursor : (useStreamTime ? Date.now() : 0);
    const token = ++this.fetchToken;
    if (!append) {
      await wx.pageScrollTo({ scrollTop: 0, smooth: true });

    }
    const oldList = this.data.helpList;
    this.setData({
      cursor,
      isLoading: true,
      helpList: append ? oldList : [],
    });
    try {
      const { onlyBounty } = this.data;
      const resp = await HelpAPI.getHelps({
        rid, onlyBounty,
        streamTime: cursor, count: COUNT_PER_PAGE,
      })
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
      if (append && oldList.length !== this.data.helpList.length) {
        console.log('list changed, ignore result');
        return;
      }
      const newList = append ? oldList.concat(...resp.data) : resp.data;
      const newCursor = useStreamTime
        ? newList[newList.length - 1]?.polish_time ?? Date.now()
        : newList.length;
      this.setData({
        isLoading: false,
        cursor: newCursor,
        helpList: newList,
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

  async onRegionClick(ev: TouchEvent) {
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
      await this.fetchList();
    });
  },

// @ts-ignore
  async onShareAppMessage(options) {
    await ensureVerified();
    const help = options.target?.dataset?.help;
    return await onShareHelp(options, help)
  },
})