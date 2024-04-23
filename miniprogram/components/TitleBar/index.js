import getConstants from "../../constants";
import { redirectToHome } from "../../utils/router";

Component({
  properties: {
    title: {
      type: String,
      value: '详情'
    },
    hasDivider: {
      type: Boolean,
      value: true
    },
  },
  data: {
    ...getConstants(),
    isTabBarPage: false,
    isFirstPage: false,
  },
  attached() {
    const pages = getCurrentPages();
    this.setData({
      isFirstPage: pages.length === 1,
      isTabBarPage: pages[pages.length - 1].getTabBar(),
    })
  },
  methods: {
    back() {
      if (this.data.isFirstPage) {
        redirectToHome().then();
      } else {
        wx.navigateBack().then();
      }
    },
  }
});
