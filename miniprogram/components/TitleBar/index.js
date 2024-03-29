import getConstants from "../../constants";

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
  },
  created() {
  },
  methods: {
    back() {
      wx.navigateBack().then();
    },
  }
});
