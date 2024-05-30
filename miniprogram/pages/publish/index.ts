import getConstants from '../../constants';
import { ensureVerified, setTabBar } from '../../utils/other';

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
  async createCommodity() {
    ensureVerified();
    await wx.navigateTo({
      url: '/pages/commodity_publish/index'
    });
  },
  async createHelp() {
    ensureVerified();
    await wx.navigateTo({
      url: '/pages/help_publish/index'
    });
  },
})