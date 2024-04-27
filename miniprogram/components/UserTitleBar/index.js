import getConstants from "../../constants";
import { getRegionPath, getRegionPathName } from "../../utils/other";
import { openProfile, redirectToHome } from "../../utils/router";

Component({
  properties: {
    user: {
      type: Object,
      value: null,
      observer(user) {
        this.userUpdated(user)
      }
    },
    time: {
      type: String,
      value: null,
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
    userUpdated(user) {
      this.setData({
        user,
        region: getRegionPathName(user.rid)
      })
    },
    onAvatarClick() {
      openProfile(this.properties.user);
    },
    back() {
      if (this.data.isFirstPage) {
        redirectToHome().then();
      } else {
        wx.navigateBack().then();
      }
    },
  }
});
