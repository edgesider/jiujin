import { setTabBar } from "../../utils/other";

const app = getApp()
import Dialog from '@vant/weapp/dialog/dialog';

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
  },

  async onShow() {
    await app.fetchSelfInfo();
  },

  onEnterHomeUserInfo() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../my_user_info/index',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  onEnterHomeTransaction() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../my_transaction/index',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  onEnterHomeRelease() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../my_commodity/index',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  onEnterPrivateMessage(){
    const registered = app.globalData.registered
    if (registered){
      app.globalData.commodity = null;
      app.loginIMWithID('USER' + app.globalData.self._id).then(() => {
        wx.navigateTo({
          url: '../../TUIService/pages/tim_index/tim_index',
        })
      }).catch((e) => {
        console.error("私信登录错误： " + e);
      });
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  // 客服消息
  onEnterCustomerService(){
    const registered = app.globalData.registered
    if (registered){
      wx.navigateTo({
        url: '../customer_service/index',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
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