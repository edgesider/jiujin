import { setTabBar } from "../../utils/other";

const app = getApp()
import Dialog from '@vant/weapp/dialog/dialog';
import { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SOLD, COMMODITY_STATUS_SELLING } from "../../constants";
import api, { CollectApi } from "../../api/api";

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

  /**
   * 生命周期函数--监听页面加载
   */
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
        selfInfo: user
      })
    })
    this.data.totalUnread = app.globalData.totalUnread;
  },

  async onShow() {
    await app.fetchSelfInfo();
  },

  onEditMyInfo() {
    if (!this.ensureRegistered()) {
      return;
    }
    wx.navigateTo({
      url: '../register/index?isEdit=true',
    })
  },

  commonCommodityFetcher: async ({ start, count }) => {
    const resp = await api.getCommodityList({
      start, count,
    })
  },

  onClickMyCommodity() {
    if (!this.ensureRegistered()) {
      return;
    }
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
              sell_id: app.globalData.self._id,
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
    if (!this.ensureRegistered()) {
      return;
    }
    wx.navigateTo({
      url: '../commodity_list/index',
      success: res => {
        res.eventChannel.emit('onParams', {
          title: '我买到的',
          api: 'starred',
          fetcher: async ({ start, count }) => {
            const resp = await api.getCommodityList({
              start, count,
              buyer_id: app.globalData.openId
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
    if (!this.ensureRegistered()) {
      return;
    }
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
        })
      }
    })
  },

  ensureRegistered() {
    const registered = app.globalData.registered;
    if (!registered) {
      this.setData({
        showLoginPopup: true
      })
    }
    return registered;
  },

  onToggleMyCollect(e){
    wx.navigateTo({
      url: '../commodity_collect/index',
    })
  },

  copyLink(e) {
    wx.setClipboardData({
      data: e.currentTarget.dataset.link,
      success: res => {
        wx.showToast({
          title: '已复制',
          duration: 1000,
        })
      }
    })
  },

  // 订阅消息：当有人购买用户发布的商品时，推送消息给此用户
  onAuthReceiveMsg() {
    const registered = app.globalData.registered
    if (!registered) {
      this.setData({
        showLoginPopup: true
      })
      return
    }

    // 模板ID 需要在微信公众平台中配置
    const tmplId = 's9MweXoRKb_IWTm0edo6Ztso2BLcWSrYuTcNT1cDTME'
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: async (res) => {
        console.log(await wx.getSetting({
          withSubscriptions: true,
        }))
        Dialog.alert({
          message: '当您有新的交易时，将接收到一次推送。若收到后，想要继续接受推送，则需再次点击此按钮。',
          theme: 'round-button',
        })
      }
    })
  },

  onCommodityReleaseTab() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../commodity_publish/index',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  onCommodityListTab() {
    wx.redirectTo({
      url: '../home/index',
    })
  },


  onCancelLoginPopup() {
    this.setData({
      showLoginPopup: false
    })
  },

  // 用户注册
  async onAuth(event) {
    const userInfo = event.detail.userInfo
    console.log(userInfo)
    wx.setStorageSync('userInfo', userInfo)
    this.setData({
      showLoginPopup: false
    })
    wx.redirectTo({
      url: '../register/index',
    })

  },
})