const app = getApp();

Component({
  properties: {
    title: {
      type: String,
      default: '详情'
    }
  },
  data: {
    StatusBar: app.globalData.StatusBar,
    CustomBar: app.globalData.CustomBar,
  },
  created() {
  },
  methods: {
    back() {
      wx.navigateBack().then();
    },
  }
});
