// miniprogram/pages/home/home.js
const app = getApp()
const api = require('../../api/api')
import Dialog from '@vant/weapp/dialog/dialog';

const placeholderUser = {
  _id: "0",
  avatar_url: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132',
  create_time: 0,
  is_deleted: false,
  name: "微信用户",
  rid: 0,
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
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    if (app.globalData.registered) {
      const { data: selfInfo } = await api.getSelfInfo();
      this.setData({ selfInfo });
    }
    // wx.showLoading({
    //   title: '加载中',
    // })
    //
    // // 获取我的信息和大学信息
    // const registered = app.globalData.registered && !debugRegister;
    // let myInfoAndMyUniversityInfo = {}
    // if(registered){
    //   res = await cache.getMyInfoAndMyUniversityInfo()
    //   myInfoAndMyUniversityInfo = res.data
    //   res = cache.setMyInfoAndMyUniversityInfo({myInfoAndMyUniversityInfo})
    //   if(res.errno == -1){
    //     console.log("更新我的信息和大学信息缓存失败！")
    //   }
    // }else{
    //   myInfoAndMyUniversityInfo = {
    //     "avatar_url": "https://6472-dreamland2-a708ef-1259161827.tcb.qcloud.la/bg-image/default-avatar.PNG?sign=a081b590e23599cb28b39dcc12cd5f79&t=1603671410",
    //     "name": "未注册",
    //     "universityInfo":{
    //       "name": "注册后可选择大学"
    //     },
    //     "total_transaction": 0,
    //     "total_release": 0
    //   }
    // }
    //
    // const userAvatarUrl = myInfoAndMyUniversityInfo.avatar_url
    // const userName = myInfoAndMyUniversityInfo.name
    // const universityName = myInfoAndMyUniversityInfo.universityInfo.name
    // const totalTransaction = myInfoAndMyUniversityInfo.total_transaction
    // const totalRelease = myInfoAndMyUniversityInfo.total_release
    // this.setData({
    //   userAvatarUrl,
    //   userName,
    //   universityName,
    //   totalTransaction,
    //   totalRelease
    // })
    //
    // wx.hideLoading()

  },

  onEnterHomeUserInfo() {
    const registered = app.globalData.registered
    if (registered) {
      wx.navigateTo({
        url: '../home_user_info/home_user_info',
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
        url: '../home_transaction/home_transaction',
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
        url: '../home_release/home_release',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }

  },

  onEnterHomeAbout() {
    wx.navigateTo({
      url: '../home_about/home_about',
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
        url: '../commodity_release/commodity_release',
      })
    } else {
      this.setData({
        showLoginPopup: true
      })
    }
  },

  onCommodityListTab() {
    wx.redirectTo({
      url: '../commodity_list/commodity_list',
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
      url: '../index_register/index_register',
    })

  },
})