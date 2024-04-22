// // pages/help/index.ts
// import { ensureRegistered, getRegionPath, setTabBar } from "../../utils/other";
// import getConstants, { DEFAULT_REGION_ID, HELP_STATUS_RUNNING } from "../../constants";
// import { buildShareParam, parseShareInfo, reportShareInfo } from "../../utils/share";
// import api, { getOpenId } from "../../api/api";
// const app = getApp()
// const COUNT_PER_PAGE = 12
//
// let needRefresh = false;
//
// export function setNeedRefresh() {
//   needRefresh = true;
// }
// Page({
//
//   /**
//    * 页面的初始数据
//    */
//   data: {
//     ...getConstants(),
//     scrollTop: 0,
//     pageIndex: 0,
//     searchInput: "",
//
//     self: null,
//     ridToRegion: null,
//     // 可选的区域，按照层级排列L4、L3、L2、L1
//     regions: [],
//     selectedRegionIndex: 0, // 选中的区域
//
//     helpList: [],
//     cursor: 0,
//     isLoading: false,
//     pullDownRefreshing: false,
//
//     banners: [],
//
//     showRankingPopup: false,
//     rankingPopupTop: 0,
//     rankingOptions: [
//       { key: 'create_time-desc', text: '时间由近到远' },
//       { key: 'create_time-asc', text: '时间由远到近' },
//       { key: 'bounty-asc', text: '悬赏由低到高' },
//       { key: 'bounty-desc', text: '悬赏由高到低' },
//     ],
//     chosenRankingKey: 'create_time-desc',
//   },
//   fetchToken: 0,
//   /**
//    * 生命周期函数--监听页面加载
//    */
//   async onLoad(options) {
//     setTabBar(this);
//     const { shareInfo: shareInfoStr } = options;
//     const shareInfo = parseShareInfo(shareInfoStr);
//     if (shareInfo) {
//       console.log('shareInfo', shareInfo);
//       reportShareInfo(shareInfo).then();
//     }
//     this.setData({ isLoading: true })
//     try {
//       await app.waitForReady();
//       this.updateRegions();
//       // await this.loadBanners();
//       await this.fetchList();
//     } catch (e) {
//       await wx.showToast({
//         title: '网络错误',
//         icon: 'error',
//       });
//       console.error(e);
//     } finally {
//       this.setData({ isLoading: false });
//     }
//
//
//   },
//   onClickLogo() {
//     // openLogin();
//   },
//
//   onPageScroll(options) {
//     const { scrollTop } = options;
//     this.setData({ scrollTop });
//   },
//   /**
//    * 生命周期函数--监听页面显示
//    */
//   async onShow() {
//     if (needRefresh) {
//       needRefresh = false;
//       await this.fetchList();
//     }
//     if (this.data.self?.rid !== app.globalData.self?.rid) {
//       this.updateRegions();
//       await Promise.all([this.fetchList()]);
//     }
//   },
//
//   updateRegions() {
//     const { self, ridToRegion } = app.globalData;
//     const rid = self?.rid ?? DEFAULT_REGION_ID;
//
//     const regionPath = getRegionPath(rid);
//     if (self) {
//       // 已登录
//       this.setData({
//         self,
//         ridToRegion,
//         regions: regionPath,
//         selectedRegionIndex: 0,
//       });
//     } else {
//       // 未登录，展示默认的区域
//       this.setData({
//         self,
//         ridToRegion,
//         regions: regionPath,
//         selectedRegionIndex: 0,
//       });
//     }
//   },
//
//   async fetchList({ append } = {}) {
//     console.log("调用fetchList开始")
//     console.log(`fetch: append=${append}, rid=${this.data.regions[this.data.selectedRegionIndex]._id}`);
//
//     const rid = this.data.regions[this.data.selectedRegionIndex]._id;
//     console.log("rid")
//     console.log(rid)
//     console.log("append")
//     console.log(append)
//
//     const start = append ? this.data.cursor : 0;
//     console.log("121212")
//     console.log((append ? this.data.cursor : 0))
//     console.log("start")
//     console.log(start)
//     console.log("this.data.cursor")
//     console.log(this.data.cursor)
//     const token = ++this.fetchToken;
//     if (!append) {
//       await wx.pageScrollTo({ scrollTop: 0, smooth: true });
//     }
//     const oldList = this.data.helpList;
//     this.setData({
//       cursor: start,
//       isLoading: true,
//       helpList: append ? oldList : [],
//     });
//     console.log("gegnxin this.data.cursor")
//     console.log(this.data.cursor)
//     try {
//       console.log("fasong start")
//       console.log(start)
//       const [orderBy, order] = this.data.chosenRankingKey.split('-');
//       const resp = await api.getHelpList({
//         rid, status: HELP_STATUS_RUNNING,
//         start, count: COUNT_PER_PAGE,
//         order_by: orderBy, order,
//       });
//       if (resp.isError) {
//         await wx.showToast({ title: '网络错误' })
//         return;
//       }
//       if (token !== this.fetchToken) {
//         console.log(`fetch token mismatch, ignore result: required=${token}, actual=${this.fetchToken}`);
//         return;
//       }
//       if (rid !== this.data.regions[this.data.selectedRegionIndex]._id) {
//         console.log('rid mismatch, ignore result');
//         return;
//       }
//       if (append && oldList.length !== this.data.helpList.length) {
//         console.log('list changed, ignore result');
//         return;
//       }
//       console.log("resp.data")
//       console.log(resp.data)
//       console.log("jiude this.data.helpList")
//       console.log(this.data.helpList)
//       const data = append ? oldList.concat(resp.data) : resp.data;
//       const cursor = data.length;
//       this.setData({
//         isLoading: false,
//         cursor,
//         helpList: data,
//       });
//       console.log("xinde this.data.helpList")
//       console.log(this.data.helpList)
//     } catch (e) {
//       console.error(e);
//     }
//     console.log("调用fetchList结束")
//   },
//   async loadMore() {
//     await this.fetchList({ append: true });
//   },
//
//   async refreshCurrentTab() {
//     await this.fetchList();
//   },
//
//   async onRefresherRefresh() {
//     this.setData({ pullDownRefreshing: true, })
//     await this.fetchList();
//     this.setData({ pullDownRefreshing: false, })
//   },
//   /**
//    * 页面上拉触底事件的处理函数
//    */
//   async onReachBottom() {
//     await this.loadMore();
//   },
//
//
//   async onRegionClick(ev) {
//     const targetIdx = ev.currentTarget.dataset.idx;
//     if (typeof targetIdx !== 'number') {
//       return;
//     }
//     this.setData({
//       selectedRegionIndex: targetIdx,
//     }, async () => {
//       await this.fetchList();
//     });
//   },
//
//
//   onToggleRankingSwitch() {
//     if (this.data.showRankingPopup) {
//       this.setData({
//         showRankingPopup: false,
//       });
//       return;
//     }
//     wx.createSelectorQuery()
//       .select('#ranking-switch')
//       .boundingClientRect(res => {
//         const top = res.top + 40;
//         this.setData({
//           showRankingPopup: true,
//           rankingPopupTop: top,
//         })
//       })
//       .exec();
//   },
//
//   onRankingKeyChanged(event) {
//     const { rankingKey } = event.currentTarget.dataset;
//     this.setData({
//       showRankingPopup: false,
//       chosenRankingKey: rankingKey
//     });
//     this.fetchList();
//   },
//   /**
//    * 用户点击右上角分享
//    */
//   onShareAppMessage(options) {
//     const shareInfo = buildShareParam({
//       type: 'app',
//       from: options.from,
//       fromUid: getOpenId(),
//       timestamp: Date.now(),
//       method: 'card'
//     });
//     return {
//       title: '闲置买卖，又近又快',
//       path: `/pages/help/index?shareInfo=${encodeURIComponent(shareInfo)}`
//     }
//   },
//   /**
//    * 生命周期函数--监听页面初次渲染完成
//    */
//   onReady() {
//
//   },
//
//
//
//
//   /**
//    * 生命周期函数--监听页面隐藏
//    */
//   onHide() {
//
//   },
//
//   /**
//    * 生命周期函数--监听页面卸载
//    */
//   onUnload() {
//
//   },
//
//   /**
//    * 页面相关事件处理函数--监听用户下拉动作
//    */
//   onPullDownRefresh() {
//
//   },
//
// })
//
//
//
import getConstants, { COMMODITY_STATUS_SELLING, DEFAULT_REGION_ID, HELP_STATUS_RUNNING } from "../../constants";
import { getRegionPath, setTabBar } from "../../utils/other";
import { buildShareParam, parseShareInfo, reportShareInfo } from "../../utils/share";
import api, { getOpenId } from "../../api/api";

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
      { key: 'create_time-desc', text: '时间由近到远' },
      { key: 'create_time-asc', text: '时间由远到近' },
      { key: 'bounty-asc', text: '价格由低到高' },
      { key: 'bounty-desc', text: '价格由高到低' },
    ],
    chosenRankingKey: 'create_time-desc',
  },
  fetchToken: 0,
  async onLoad(options) {
    setTabBar(this);

    const { shareInfo: shareInfoStr } = options;
    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }

    this.setData({ isLoading: true })
    try {
      await app.waitForReady();
      this.updateRegions();
      // await this.loadBanners();
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
  onClickLogo() {
    // openLogin();
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
      await Promise.all([this.fetchList()]);
    }
  },
  updateRegions() {
    const { self, ridToRegion } = app.globalData;
    const rid = self?.rid ?? DEFAULT_REGION_ID;

    const regionPath = getRegionPath(rid);
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
      const [orderBy, order] = this.data.chosenRankingKey.split('-');
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
        const top = res.top + 40;
        this.setData({
          showRankingPopup: true,
          rankingPopupTop: top,
        })
      })
      .exec();
  },

  onRankingKeyChanged(event) {
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