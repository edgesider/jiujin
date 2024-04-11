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
    this.setData({
      isFirstPage: pages.length === 1,
    });
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
