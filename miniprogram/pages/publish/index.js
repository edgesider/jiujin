// pages/publish/index.ts
import { ensureRegistered, getRegionPath, setTabBar } from "../../utils/other";
import getConstants from "../../constants";
Page({
  createCommodity: function() {
    wx.navigateTo({
      url: '/pages/commodity_publish/index' // 跳转的目标页面路径
    })
  },
  createHelp: function() {
    wx.navigateTo({
      url: '/pages/help_publish/index' // 跳转的目标页面路径
    })
  },
  /**
   * 页面的初始数据
   */
  data: {
    ...getConstants(),
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    setTabBar(this);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})