Component({
  properties: {
    commodity: {
      type: Object,
      default: null
    },
    ridToRegion: {
      type: Object,
      default: null
    },
    qualitiesMap: {
      type: Object,
      default: null
    }
  },
  data: {
    desc: '',
  },
  methods: {
    async gotoDetail() {
      if (!this.properties.commodity) {
        return;
      }
      await wx.navigateTo({
        url: `../commodity_detail/index?commodity=${encodeURIComponent(JSON.stringify(this.properties.commodity))}`
        // url: `../commodity_detail/index?cid=${this.properties.commodity._id}`
      })
    }
  },
  attached() {
    let {content} = this.properties.commodity
    // 处理content
    content = content.substring(0, 8); // 最多十个
    content = content.substring(0, content.indexOf('\n')) // 从第一个回车截断
    this.setData({desc: content})
  }
});
