import getConstants from "../../constants";

Component({
  properties: {
    title: {
      type: String,
      default: '详情'
    },
    hasBack: {
      type: Boolean,
      default: true
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
