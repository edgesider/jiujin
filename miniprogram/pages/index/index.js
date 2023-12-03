const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    showLoginPopup: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  // 获取并缓存数据库中用户的信息，若数据库中无用户信息，则缓存为空
  async onLoad(options) {
    if (app.isRegistered()) {
      wx.redirectTo({
        url: `../commodity_list/commodity_list`,
      })
    }
  },

  async onEnter(event) {
    const userInfo = event.detail.userInfo
    wx.setStorageSync('userInfo', userInfo)

    wx.redirectTo({
      url: `../commodity_list/commodity_list`,
    })
  },

  async onRegister(event) {
    const userInfo = event.detail.userInfo
    console.log(userInfo)
    wx.setStorageSync('userInfo', userInfo)

    // 用户未注册
    wx.redirectTo({
      url: '../index_register/index_register',
    })
  },

  onCancelLoginPopup() {
    this.setData({
      showLoginPopup: false
    })
  },
})