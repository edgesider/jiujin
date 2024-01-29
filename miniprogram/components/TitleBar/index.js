import getConstants from "../../constants";

const app = getApp();

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
