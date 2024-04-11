import getConstants from "../../constants";
import { getRegionPath } from "../../utils/other";
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
    hasBack: {
      type: Boolean,
      value: true
    }
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
    userUpdated(user) {
      const path = getRegionPath(user.rid);
      this.setData({
        user,
        region: path[2] ? `${path[2].name}/${path[0].name}` : path[0].name
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
