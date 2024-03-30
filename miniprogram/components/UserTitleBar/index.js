import getConstants from "../../constants";
import { getRegionPath } from "../../utils/other";
import { openProfile } from "../../utils/router";

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
  },
  created() {
    const { user } = this.properties;
    if (user) {
      const path = getRegionPath(user.rid);
      this.setData({
        user,
        region: path[2] ? `${path[2].name} / ${path[0].name}` : path[0].name
      })
    }
  },
  methods: {
    userUpdated(user) {
      const path = getRegionPath(user.rid);
      this.setData({
        user,
        region: path[2] ? `${path[2].name} / ${path[0].name}` : path[0].name
      })
    },
    onAvatarClick() {
      openProfile(this.properties.user);
    },
    back() {
      wx.navigateBack().then();
    },
  }
});
