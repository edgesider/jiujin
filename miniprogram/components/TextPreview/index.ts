import getConstants from "../../constants";

/**
 * 对于没有图片的互助或者商品，使用这个纯文字的预览卡片
 */
Component({
  properties: {
    content: {
      type: String,
      value: "..."
    },
    lines: {
      type: Number,
      value: 3
    },
    lineHeight: {
      type: String,
      value: '30rpx'
    },
  },
  data: {
    ...getConstants(),
  },
  lifetimes: {
    attached() {
    },
    detached() {
    }
  },
  methods: {
  }
});
