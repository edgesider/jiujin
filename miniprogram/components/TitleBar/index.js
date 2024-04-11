import getConstants from "../../constants";
import { redirectToHome } from "../../utils/router";

Component({
  properties: {
    title: {
      type: String,
      value: '详情'
    },
    hasBack: {
      type: Boolean,
      value: true
    },
    hasDivider: {
      type: Boolean,
      value: true
    },
  },
  data: {
    ...getConstants(),
    isFirstPage: false,
  },
  attached() {
    const pages = getCurrentPages();
    console.log(pages.map(p => p.getTabBar()));
    if (pages.length === 1 && !pages[0].getTabBar()) {
      // 只有一个页面，并且这个页面不带TabBar（不是主页的）
      this.setData({
        isFirstPage: true,
      });
    }
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
