import { setTabBar } from "../../../utils/other";

const app = getApp();

Page({
  data: {
    config: {
    }
  },

  async onLoad(options) {
    setTabBar(this);
    await app.waitForReady();

    const TUIKit = this.selectComponent('#TUIKit');
    TUIKit.init();
  },

  async onShow() {
  },
});