import getConstants from '../../constants';
import { ensureVerified, setTabBar } from '../../utils/other';
import { openVerify } from '../../utils/router';

const app = getApp();

Page({
  data: {
    ...getConstants(),
    showNotVerifiedDialog: false,
  },
  onLoad() {
    setTabBar(this);
  },
  async onShow() {
    await app.fetchSelfInfo();
  },
  ensureVerified() {
    try {
      ensureVerified();
    } catch (e) {
      this.setData({
        showNotVerifiedDialog: true,
      });
      throw e;
    }
  },
  async createCommodity() {
    this.ensureVerified();
    await wx.navigateTo({
      url: '/pages/commodity_publish/index'
    });
  },
  async createHelp() {
    this.ensureVerified();
    await wx.navigateTo({
      url: '/pages/help_publish/index'
    });
  },
  async onClickVerify() {
    await openVerify();
    this.setData({
      showNotVerifiedDialog: false,
    });
  },
  onClickMask() {
    this.setData({ showNotVerifiedDialog: false });
  }
})