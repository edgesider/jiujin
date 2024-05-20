import { ensureRegistered, getRegionPathName, setTabBar } from "../../utils/other";
import getConstants, {
  COMMODITY_STATUS_SOLD,
  COMMODITY_STATUS_SELLING,
  COMMODITY_STATUS_DEACTIVATED, HELP_STATUS_RUNNING
} from "../../constants";
import api from "../../api/api";
import { openCommodityEdit, openProfile } from "../../utils/router";
import { waitForAppReady } from "../../utils/globals";
import { CommodityAPI } from "../../api/CommodityAPI";
import { HelpAPI } from "../../api/HelpAPI";

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
    wx.navigateTo({
      url: `../commodity_list/index?type=${type}`,
      success: res => {
        res.eventChannel.emit('onParams', {
          title: ({
            selling: '我发布的闲置',
            bought: '我买到的',
            sold: '我卖出的',
            deactivated: '我下架的',
            collected: '我收藏的闲置',
          })[type],
          fetcher: async ({ start, count }) => {
            let resp;
            if (type === 'collected') {
              resp = await CommodityAPI.listCollected({ start, count });
            } else {
              const status = ({
                selling: COMMODITY_STATUS_SELLING,
                sold: COMMODITY_STATUS_SOLD,
                deactivated: COMMODITY_STATUS_DEACTIVATED,
              })[type];
              resp = await CommodityAPI.listMine({
                status,
                role: type === 'bought' ? 'buyer' : 'seller',
                start, count,
              });
            }
            if (resp.isError) {
              console.error(resp);
              return null;
            }
            return resp.data;
          },

          onClick: async ({ type, commodity }) => {
            return await ({
              'click-card': () => {
                wx.navigateTo({
                  url: `../commodity_detail/index?id=${commodity._id}`
                })
              },
              polish: async () => {
                await wx.showLoading({ mask: true, title: '擦亮中...' });
                const resp = await api.polishCommodity({ id: commodity._id });
                await wx.hideLoading();
                if (resp.isError) {
                  await wx.showToast({
                    title: '三小时可擦亮一次',
                    icon: 'error',
                    mask: true,
                  });
                  return;
                }
                await wx.showToast({
                  title: '擦亮成功',
                  icon: 'success',
                  mask: true,
                  duration: 500,
                });
                return {
                  action: 'fetchSingle'
                };
              },
              deactivate: async () => {
                await wx.showLoading({ mask: true, title: '正在下架...' });
                const resp = await api.deactivateCommodity({ id: commodity._id, });
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  await wx.showToast({ title: '下架失败', icon: 'error', mask: true });
                  return;
                }
                await wx.showToast({ title: '下架成功', icon: 'success', mask: true });
                return {
                  action: 'fetchSingle'
                };
              },
              activate: async () => {
                await wx.showLoading({ mask: true, title: '正在重新上架...' });
                const resp = await api.activateCommodity({ id: commodity._id, });
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  await wx.showToast({ title: '上架失败', icon: 'error', mask: true });
                  return;
                }
                await wx.showToast({ title: '上架成功', icon: 'success', mask: true });
                return {
                  action: 'fetchSingle'
                };
              },
              edit: async () => {
                await openCommodityEdit(commodity, true);
                return { action: 'fetchSingle' };
              },
              delete: async () => {
                return new Promise(async () => {
                  wx.showModal({
                    title: '提示',
                    content: `确认删除`,
                    success: async (res) => {
                      if (res.confirm) {
                        await wx.showLoading({ title: '删除中...', mask: true })
                        const resp = await api.deleteCommodity({ id: commodity._id })
                        if (resp.isError) {
                          await wx.showToast({ title: '删除失败', icon: 'error', mask: true });
                        } else {
                          await wx.hideLoading();
                          res({ action: 'fetchAll', });
                        }
                      } else if (res.cancel) {
                        // pass
                      }
                    }
                  })
                });
              },
              republish: async () => {
                return new Promise(async (res) => {
                  await wx.navigateTo({
                    url: `../commodity_publish/index?commodity=${JSON.stringify(commodity)}`,
                    events: {
                      afterPublished: res({ action: 'fetchAll', currTab: 'selling' })
                    },
                  })
                });
              },
            })[type]?.();
          },
        })
      }
    });
  },

  gotoHelpList(ev) {
    ensureRegistered();
    const { type } = ev.currentTarget.dataset;
    wx.navigateTo({
      url: `../help_list/index?type=${type}`,
      success: res => {
        res.eventChannel.emit('onParams', {
          title: ({
            selling: '我发布的求助',
            collected: '我收藏的求助',
            liked: '我点赞的求助'
          })[type],

          fetcher: async ({ start, count }) => {
            let resp;
            if (type === 'collected') {
              resp = await HelpAPI.listCollected({ start, count });
            } else if (type === 'liked') {
              resp = await HelpAPI.listLiked({ start, count });
            } else {
              const status = ({
                selling: HELP_STATUS_RUNNING
              })[type];
              resp = await HelpAPI.listMine({ status, role: 'seller', start, count })
            }
            if (resp.isError) {
              console.error(resp);
              return null;
            }
            return resp.data;
          },

          onClick: async ({ type, help }) => {
            return await ({
              'click-card': () => {
                wx.navigateTo({
                  url: `../help_detail/index?id=${help._id}`
                })
              },
              polish: async () => {
                await wx.showLoading({ mask: true, title: '擦亮中...' });
                const resp = await api.polishHelp({ id: help._id });
                await wx.hideLoading();
                if (resp.isError) {
                  await wx.showToast({
                    title: '三小时可擦亮一次',
                    icon: 'error',
                    mask: true,
                  });
                  return;
                }
                await wx.showToast({
                  title: '擦亮成功',
                  icon: 'success',
                  mask: true,
                  duration: 500,
                });
                return {
                  action: 'fetchSingle'
                };
              },
              deactivate: async () => {
                await wx.showLoading({ mask: true, title: '求助已解决' });
                const resp = await api.deactivateHelp({ id: help._id, });
                await wx.hideLoading();
                if (resp.isError) {
                  console.error(resp)
                  await wx.showToast({ title: '求助解决失败', icon: 'error', mask: true });
                  return;
                }
                await wx.showToast({ title: '求助解决成功', icon: 'success', mask: true });
                return {
                  action: 'fetchSingle'
                };
              },
              edit: async () => {
                return new Promise(async (res) => {
                  await wx.navigateTo({
                    url: `../help_publish/index?help=${JSON.stringify(help)}&isEdit=1`,
                    events: {
                      afterEdited: async () => {
                        res({ action: 'fetchSingle', });
                      }
                    },
                  })
                });
              },
              delete: async () => {
                return new Promise(async (resolve) => {
                  wx.showModal({
                    title: '提示',
                    content: `确认删除`,
                    success: async (response) => {
                      if (response.confirm) {
                        await wx.showLoading({ title: '删除中...', mask: true })
                        const resp = await api.deleteHelp({ id: help._id })
                        if (resp.isError) {
                          await wx.showToast({ title: '删除失败', icon: 'error', mask: true });
                        } else {
                          await wx.hideLoading();
                          resolve({ action: 'fetchAll', });
                        }
                      } else if (response.cancel) {
                        // pass
                      }
                    }
                  })
                });
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

  async onGetPhone(ev) {
    const { code, errno, errMsg } = ev.detail;
    if (errno || !code) {
      console.error(`getPhoneNumber failed, errno=${errno}, errMsg=${errMsg}`);
      return;
    }
    const resp = await api.getPhoneNumber(code)
    if (resp.isError) {
      console.error('getPhoneNumber failed', resp);
      return;
    }
    console.log(resp.data);
  },
  gotoVerify() {
    const self = this.data.selfInfo;
    if (!self || self.authentication_status) {
      return;
    }
    openVerify();
  },
})