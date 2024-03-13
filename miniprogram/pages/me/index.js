import { assertRegistered, setTabBar } from "../../utils/other";

const app = getApp()
import { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SOLD, COMMODITY_STATUS_SELLING } from "../../constants";
import api, { CollectApi, getOpenId } from "../../api/api";
import { openProfile } from "../../router";

const placeholderUser = {
  _id: "0",
  avatar_url: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132',
  create_time: 0,
  is_deleted: false,
  name: "点击登录",
  rid: -1,
  sex: 0,
  total_release: 0,
  total_transaction: 0,
  update_time: 0,
};

Page({

  /**
   * 页面的初始数据
   */
  data: {
    pageIndex: 1,
    selfInfo: placeholderUser,
    ridToRegion: null,
    totalUnread: 0,
  },

  async onLoad(options) {
    setTabBar(this);
    await app.waitForReady();
    const { self, ridToRegion } = app.globalData;
    if (app.globalData.self) {
      this.setData({
        selfInfo: self,
        ridToRegion,
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
    assertRegistered();
    wx.navigateTo({
      url: '../register/index',
    })
  },

  commonCommodityFetcher: async ({ start, count }) => {
    const resp = await api.getCommodityList({
      start, count,
    })
  },

  onClickMyCommodity() {
    assertRegistered();
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
                  await wx.showModal({
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
    assertRegistered();
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
    assertRegistered();
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
    assertRegistered();
    openProfile(app.globalData.self);
  },
})