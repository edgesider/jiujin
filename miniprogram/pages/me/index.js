import { ensureRegistered, getRegionPath, setTabBar } from "../../utils/other";
import getConstants, { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SOLD, COMMODITY_STATUS_SELLING } from "../../constants";
import api, { CollectApi, getOpenId } from "../../api/api";
import { openProfile } from "../../router";

const app = getApp()

Page({
  data: {
    ...getConstants(),
    pageIndex: 1,
    selfInfo: null,
    regionName: '',
    totalUnread: 0,
  },

  async onLoad(options) {
    setTabBar(this);
    await app.waitForReady();
    const { self } = app.globalData;
    if (app.globalData.self) {
      const regionPath = getRegionPath(self.rid);
      this.setData({
        selfInfo: self,
        regionName: regionPath[2] ? `${regionPath[2].name} / ${regionPath[0].name}` : regionPath[0].name,
      });
    }
    app.userChangedSubject.subscribe(user => {
      this.setData({
        selfInfo: user ?? null
      })
    })
    this.data.totalUnread = app.globalData.totalUnread;
  },

  async onShow() {
    await app.fetchSelfInfo();
    const { self } = app.globalData;
    this.setData({
      selfInfo: self
    });
  },

  onEditMyInfo() {
    ensureRegistered();
    wx.navigateTo({
      url: '../register/index',
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
            started: '我收藏的',
          })[type],
          fetcher: async ({ start, count }) => {
            let resp;
            if (type === 'started') {
              resp = await CollectApi.getAll(start, count);
            } else {
              const status = ({
                selling: COMMODITY_STATUS_SELLING,
                sold: COMMODITY_STATUS_SOLD,
                deactivated: COMMODITY_STATUS_OFF,
              })[type];
              const self = app.globalData.self._id;
              const filter = { status, start, count };
              if (type === 'bought') {
                filter['buyer_id'] = self;
              } else {
                filter['seller_id'] = self;
              }

              resp = await api.getCommodityList(filter);
            }
            if (resp.isError) {
              console.error(resp);
              return null;
            }
            return resp.data;
          },
        })
      }
    });
  },

  onClickMyCommodity() {
    ensureRegistered();
    wx.navigateTo({
      url: '../commodity_list/index',
      success: res => {
        res.eventChannel.emit('onParams', {
          title: '我发布的',
          tabs: [
            { key: 'selling', text: '正在出售' },
            { key: 'off', text: '已下架' },
            { key: 'sold', text: '已售出' },
          ],
          currTab: 'selling',
          fetcher: async ({ start, count, currTab }) => {
            const statusMap = {
              selling: COMMODITY_STATUS_SELLING,
              off: COMMODITY_STATUS_OFF,
              sold: COMMODITY_STATUS_SOLD,
            };
            const resp = await api.getCommodityList({
              start, count,
              status: statusMap[currTab],
              seller_id: app.globalData.self._id,
            });
            if (resp.isError) {
              console.log(resp);
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
                    title: '擦亮太频繁啦',
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
              off: async () => {
                await wx.showLoading({ mask: true, title: '正在下架...' });
                const resp = await api.offCommodity({ id: commodity._id, });
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
              edit: async () => {
                return new Promise(async (res) => {
                  await wx.navigateTo({
                    url: `../commodity_publish/index?commodity=${JSON.stringify(commodity)}&isEdit=1`,
                    events: {
                      afterEdited: async () => {
                        res({ action: 'fetchSingle', });
                      }
                    },
                  })
                });
              },
              delete: async () => {
                return new Promise(async (res) => {
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
      },
      fail: (error) => {
        console.error(error);
      }
    })
  },

  onClickMyBought() {
    ensureRegistered();
    wx.navigateTo({
      url: '../commodity_list/index',
      success: res => {
        res.eventChannel.emit('onParams', {
          title: '我买到的',
          api: 'starred',
          fetcher: async ({ start, count }) => {
            const resp = await api.getCommodityList({
              start, count,
              buyer_id: getOpenId()
            });
            if (resp.isError) {
              console.log(resp);
              return null;
            }
            return resp.data;
          },
          onClick: async ({ type, commodity }) => {
            return await ({
              'click-card': async () => {
                await wx.navigateTo({
                  url: `../commodity_detail/index?id=${commodity._id}`
                })
              },
            })[type]?.();
          },
        })
      }
    })
  },

  onClickMyStarred() {
    ensureRegistered();
    wx.navigateTo({
      url: '../commodity_list/index',
      success: res => {
        res.eventChannel.emit('onParams', {
          title: '我收藏的',
          fetcher: async ({ start, count }) => {
            const resp = await CollectApi.getAll(start, count);
            if (resp.isError) {
              console.log(resp);
              return null;
            }
            return resp.data;
          },
          onClick: async ({ type, commodity }) => {
            return await ({
              'click-card': async () => {
                await wx.navigateTo({
                  url: `../commodity_detail/index?id=${commodity._id}`
                })
              },
            })[type]?.();
          },
        })
      }
    })
  },
  openProfile() {
    ensureRegistered();
    openProfile(app.globalData.self);
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
})