import {
  ensureRegistered,
  ensureVerified,
  getRegionPathName,
  setTabBar,
  toastError,
  toastSucceed
} from "../../utils/other";
import getConstants, {
  COMMODITY_STATUS_SOLD,
  COMMODITY_STATUS_SELLING,
  COMMODITY_STATUS_DEACTIVATED,
  HELP_STATUS_RUNNING,
  HELP_STATUS_FINISHED, HELP_STATUS_RESOLVED, COMMODITY_STATUS_BOOKED, HELP_STATUS_RESOLVING
} from "../../constants";
import api from "../../api/api";
import {
  openAboutPage,
  openCommodityDetail,
  openCommodityEdit, openCommodityPublish,
  openHelpDetail, openHelpEdit, openHelpPublish, openMyPolishCard,
  openProfile,
  openVerify
} from "../../utils/router";
import { waitForAppReady } from "../../utils/globals";
import { CommodityAPI } from "../../api/CommodityAPI";
import { HelpAPI } from "../../api/HelpAPI";
import { VerifyStatus } from "../../api/verify";
import { UserAPI } from "../../api/UserAPI";
import { drawMyQrcode } from "../../utils/canvas";
import { metric } from "../../utils/metric";
import { isFileAccess, rmFileIfExist } from "../../utils/fs";
import { getEnvVersion } from "../../utils/env";

const app = getApp()

Page({
  data: {
    ...getConstants(),
    pageIndex: 1,
    selfInfo: null,
    regionName: '',
  },

  async onLoad() {
    setTabBar(this);
    await waitForAppReady();
    const { self } = app.globalData;
    if (app.globalData.self) {
      this.updateSelfInfo(self);
    }
    app.userChangedSubject.subscribe(user => {
      this.updateSelfInfo(user);
    })
  },

  updateSelfInfo(self) {
    if (!self) {
      return;
    }
    this.setData({
      selfInfo: self,
      regionName: getRegionPathName(self.rid),
      verifyIndex: self.verify_index.toString().padStart(8, '0'),
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
    if (type === 'my-polish-card') {
      openMyPolishCard();
      return;
    }

    // 列表页
    const title = {
      my_commodities: '我的闲置',
      my_helps: '我的互助',
      collected: '我收藏的',
      liked: '我赞过的',
    }[type];
    const tabs = {
      my_commodities: [
        { text: '在售', key: 'selling' },
        { text: '已下架', key: 'deactivated' },
        { text: '已售出', key: 'sold' },
        { text: '买到的', key: 'bought' },
      ],
      my_helps: [
        { text: '进行中', key: 'all', type: 'help' },
        { text: '已结束', key: 'finished', type: 'help' },
        { text: '已解决', key: 'resolved', type: 'help' },
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
            // 是否展示状态图片
            let showStatusImage;
            console.log('fetch_list', type, currTab);
            if (type === 'my_commodities') {
              listType = 'commodity';
              if (currTab === 'bought') {
                resp = await CommodityAPI.listMine({
                  start, count,
                  status: [COMMODITY_STATUS_SOLD, COMMODITY_STATUS_BOOKED],
                  role: 'buyer'
                });
                showStatusImage = true;
              } else {
                const status = {
                  selling: [COMMODITY_STATUS_SELLING, COMMODITY_STATUS_BOOKED],
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
                showStatusImage = currTab === 'selling';
              }
            } else if (type === 'my_helps') {
              listType = 'help';
              if (currTab === 'got-bounty') {
                resp = await HelpAPI.listMine({
                  start, count,
                  role: 'buyer', status: [HELP_STATUS_RESOLVED, HELP_STATUS_RESOLVING]
                });
              } else {
                const status = {
                  'all': [HELP_STATUS_RUNNING, HELP_STATUS_RESOLVING],
                  'finished': HELP_STATUS_FINISHED,
                  'resolved': HELP_STATUS_RESOLVED,
                }[currTab];
                if (status === undefined) {
                  throw Error('无效的状态')
                }

                resp = await HelpAPI.listMine({
                  start, count,
                  status,
                  role: 'seller',
                });
              }
              showStatusImage = false;
            } else if (type === 'collected') {
              if (currTab === 'commodity') {
                listType = 'commodity';
                resp = await CommodityAPI.listCollected({ start, count });
              } else if (currTab === 'help') {
                listType = 'help';
                resp = await HelpAPI.listCollected({ start, count });
              }
              showStatusImage = true;
            } else if (type === 'liked') {
              listType = 'help';
              resp = await HelpAPI.listLiked({ start, count });
              showStatusImage = true;
            }
            if (!resp || resp.isError) {
              console.error('response', resp);
              return null;
            }
            return {
              list: resp.data,
              listType,
              showStatusImage,
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
                await ensureVerified();
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
                return { action: 'fetchSingle' };
              },
              deactivate: async () => {
                await ensureVerified();
                if (listType === 'commodity') {
                  const reasons = ['已在小程序售出', '已在其他平台售出', '不想卖了', '其他原因']
                  const { tapIndex: idx } = await wx.showActionSheet({
                    itemList: reasons,
                  })
                  metric.write('deactivate_reason', {}, { id: item._id, reason: reasons[idx] });
                } else {
                  const { confirm } = await wx.showModal({
                    title: '确认结束？',
                    content: ''
                  });
                  if (!confirm) {
                    return;
                  }
                }
                await wx.showLoading({ mask: true, title: '请稍后' });
                const resp = listType === 'commodity'
                  ? await api.deactivateCommodity({ id: item._id, })
                  : await api.deactivateHelp({ id: item._id, })
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  toastError('网络错误');
                  return;
                }
                toastSucceed('成功');
                return { action: 'fetchAll' };
              },
              activate: async () => {
                await ensureVerified();
                if (listType !== 'commodity') {
                  throw Error('只有商品可以 activate');
                }
                await wx.showLoading({ mask: true, title: '正在重新上架...' });
                const resp = await api.activateCommodity({ id: item._id, });
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  toastError('网络错误');
                  return;
                }
                toastSucceed('上架成功');
                return { action: 'fetchAll' };
              },
              edit: async () => {
                await ensureVerified();
                if (listType === 'commodity') {
                  await openCommodityEdit(item, true);
                } else {
                  await openHelpEdit(item, true);
                }
                return { action: 'fetchAll' };
              },
              delete: async () => {
                await ensureVerified();
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
                await ensureVerified();
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

  async showMyQrCode() {
    let path = `${wx.env.USER_DATA_PATH}/my_qrcode.png`;
    if (!isFileAccess(path)) {
      await wx.showLoading({ title: '生成中' });
      try {
        const bytes = await UserAPI.getMyQrCode();
        if (!bytes) {
          toastError('获取二维码失败，请稍后重试');
          return;
        }
        path = await drawMyQrcode(bytes, path);
      } catch (e) {
        metric.write('qrcode_create_failed', {}, { reason: e?.message || e?.toString() });
        toastError('获取二维码失败，请稍后重试');
        console.error(e);
        return;
      } finally {
        await wx.hideLoading();
      }
    }
    await wx.previewImage({
      current: path,
      urls: [path]
    });
  },

  async clearQrCodeCache() {
    if (getEnvVersion() !== 'release') {
      if (rmFileIfExist(`${wx.env.USER_DATA_PATH}/my_qrcode.png`)) {
        toastSucceed('已清除二维码缓存');
      }
    }
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