import { ensureRegistered, getRegionPathName, setTabBar, toastError, toastSucceed } from "../../utils/other";
import getConstants, {
  COMMODITY_STATUS_SOLD,
  COMMODITY_STATUS_SELLING,
  COMMODITY_STATUS_DEACTIVATED,
  HELP_STATUS_RUNNING,
  HELP_STATUS_FINISHED, HELP_STATUS_RESOLVED
} from "../../constants";
import api from "../../api/api";
import {
  openAboutPage,
  openCommodityDetail,
  openCommodityEdit, openCommodityPublish,
  openHelpDetail, openHelpEdit, openHelpPublish,
  openProfile,
  openVerify
} from "../../utils/router";
import { waitForAppReady } from "../../utils/globals";
import { CommodityAPI } from "../../api/CommodityAPI";
import { HelpAPI } from "../../api/HelpAPI";
import { VerifyStatus } from "../../api/verify";

const app = getApp()

Page({
  data: {
    ...getConstants(),
    pageIndex: 1,
    selfInfo: null,
    regionName: '',
    totalUnread: 0,
  },

  async onLoad() {
    setTabBar(this);
    await waitForAppReady();
    const { self } = app.globalData;
    if (app.globalData.self) {
      this.updateSelfInfo(self);
    }
    app.userChangedSubject.subscribe(user => {
      this.setData({
        selfInfo: user ?? null
      })
    })
  },

  updateSelfInfo(self) {
    if (!self) {
      return;
    }
    this.setData({
      selfInfo: self,
      regionName: getRegionPathName(self.rid)
    });
  },

  async onShow() {
    await app.fetchSelfInfo();
    this.updateSelfInfo(app.globalData.self)
  },

  onEditMyInfo() {
    ensureRegistered();
    wx.navigateTo({
      url: '../edit_profile/index',
    })
  },

  gotoList(ev) {
    ensureRegistered();
    const { type } = ev.currentTarget.dataset;
    const title = {
      my_commodities: '我的闲置',
      my_helps: '我的互助',
      collected: '我收藏的',
      liked: '我赞过的'
    }[type];
    const tabs = {
      my_commodities: [
        { text: '在售', key: 'selling' },
        { text: '已下架', key: 'deactivated' },
        { text: '已售出', key: 'sold' },
        { text: '买到的', key: 'bought' },
      ],
      my_helps: [
        { text: '全部', key: 'all', type: 'help' },
        { text: '悬赏中', key: 'has-bounty', type: 'help' },
        { text: '已结束', key: 'finished', type: 'help' },
        { text: '已领赏', key: 'got-bounty', type: 'help' },
      ],
      collected: [
        { text: '闲置', key: 'commodity' },
        { text: '互助', key: 'help', type: 'help' },
      ],
      liked: []
    }[type];
    wx.navigateTo({
      url: `../commodity_list/index?type=${type}`,
      success: res => {
        res.eventChannel.emit('onParams', {
          title,
          tabs,
          fetcher: async ({ start, count, currTab }) => {
            let resp;
            let listType;
            console.log('fetch_list', type, currTab);
            if (type === 'my_commodities') {
              listType = 'commodity';
              if (currTab === 'bought') {
                resp = await CommodityAPI.listMine({
                  start, count,
                  status: COMMODITY_STATUS_SOLD,
                  role: 'buyer'
                });
              } else {
                const status = {
                  selling: COMMODITY_STATUS_SELLING,
                  deactivated: COMMODITY_STATUS_DEACTIVATED,
                  sold: COMMODITY_STATUS_SOLD,
                }[currTab];
                if (status === undefined) {
                  throw Error('无效的状态')
                }
                resp = await CommodityAPI.listMine({
                  start, count,
                  status,
                  role: 'seller'
                });
              }
            } else if (type === 'my_helps') {
              listType = 'help';
              if (currTab === 'got-bounty') {
                resp = await HelpAPI.listMine({ start, count, role: 'buyer', status: HELP_STATUS_RESOLVED });
              } else {
                const status = {
                  'all': HELP_STATUS_RUNNING,
                  'has-bounty': HELP_STATUS_RUNNING,
                  'finished': HELP_STATUS_FINISHED,
                }[currTab];
                if (status === undefined) {
                  throw Error('无效的状态')
                }
                resp = await HelpAPI.listMine({
                  start, count,
                  status, role: 'seller',
                  onlyBounty: currTab === 'has-bounty'
                });
              }
            } else if (type === 'collected') {
              if (currTab === 'commodity') {
                listType = 'commodity';
                resp = await CommodityAPI.listCollected({ start, count });
              } else if (currTab === 'help') {
                listType = 'help';
                resp = await HelpAPI.listCollected({ start, count });
              }
            } else if (type === 'liked') {
              listType = 'help';
              resp = await HelpAPI.listLiked({ start, count });
            }
            if (!resp || resp.isError) {
              console.error('response', resp);
              return null;
            }
            return {
              list: resp.data,
              listType,
            };
          },
          onClick: async ({ type, listType, item }) => {
            return await ({
              'click-card': () => {
                if (listType === 'commodity') {
                  openCommodityDetail({ id: item._id });
                } else if (listType === 'help') {
                  openHelpDetail({ id: item._id });
                }
              },
              polish: async () => {
                await wx.showLoading({ mask: true, title: '擦亮中...' });
                const resp = listType === 'commodity'
                  ? await api.polishCommodity({ id: item._id })
                  : await api.polishHelp({ id: item._id });
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp);
                  toastError('三小时可擦亮一次');
                  return;
                }
                toastSucceed('擦亮成功')
                return { action: 'fetchAll' };
              },
              deactivate: async () => {
                await wx.showLoading({ mask: true, title: '正在下架...' });
                const resp = listType === 'commodity'
                  ? await api.deactivateCommodity({ id: item._id, })
                  : await api.deactivateHelp({ id: item._id, })
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  toastError('下架失败');
                  return;
                }
                toastSucceed('下架成功');
                return { action: 'fetchSingle' };
              },
              activate: async () => {
                await wx.showLoading({ mask: true, title: '正在重新上架...' });
                const resp = listType === 'commodity'
                  ? await api.activateCommodity({ id: item._id, })
                  : await api.activateHelp({ id: item._id, })
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  toastError('上架失败');
                  return;
                }
                toastSucceed('上架成功');
                return { action: 'fetchSingle' };
              },
              edit: async () => {
                if (listType === 'commodity') {
                  await openCommodityEdit(item, true);
                } else {
                  await openHelpEdit(item, true);
                }
                return { action: 'fetchSingle' };
              },
              delete: async () => {
                const { confirm } = await wx.showModal({
                  title: '提示',
                  content: `确认删除`,
                  showCancel: true,
                });
                if (confirm) {
                  await wx.showLoading({ title: '删除中...', mask: true })
                  const resp = listType === 'commodity'
                    ? await api.deleteCommodity({ id: item._id })
                    : await api.deleteHelp({ id: item._id })
                  if (resp.isError) {
                    toastError('删除失败');
                  } else {
                    await wx.hideLoading();
                    return { action: 'fetchAll' };
                  }
                }
              },
              republish: async () => {
                if (listType === 'commodity') {
                  await openCommodityPublish(item, true);
                } else {
                  await openHelpPublish(item, true);
                }
              },
            })[type]?.();
          },
        })
      }
    });
  },
  onClickAvatar() {
    ensureRegistered();
    openProfile(app.globalData.self).then();
  },
  async gotoVerify() {
    const self = this.data.selfInfo;
    if (!self || self.verify_status !== VerifyStatus.NotVerified) {
      return;
    }
    await openVerify();
  },
  onClickAboutUs() {
    openAboutPage('about_us');
  },
  onClickContractUs() {
    openAboutPage('contract_us');
  },
})