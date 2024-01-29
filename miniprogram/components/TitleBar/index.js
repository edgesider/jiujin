import getConstants from "../../constants";

Component({
  properties: {
    title: {
      type: String,
      default: '详情'
    }
  },
  data: {
    ...getConstants(),
  },
  created() {
  },
  methods: {
    back() {
      wx.navigateBack().then();
    },
  }
});
