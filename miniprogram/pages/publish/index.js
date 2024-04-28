import getConstants from "../../constants";
import { setTabBar } from "../../utils/other";

Page({
  createCommodity: function () {
    wx.navigateTo({
      url: '/pages/commodity_publish/index' // 跳转的目标页面路径
    })
  },
  createHelp: function () {
    wx.navigateTo({
      url: '/pages/help_publish/index' // 跳转的目标页面路径
    })
  },
  data: {
    ...getConstants(),
  },
  onLoad() {
    setTabBar(this);
  }
})