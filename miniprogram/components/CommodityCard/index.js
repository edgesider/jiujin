import { getQualitiesMap } from "../../utils/strings";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
      default: null
    },
  },
  data: {
    desc: '',
    ridToRegion: app.globalData.ridToRegion,
    qualitiesMap: getQualitiesMap()
  },
  methods: {
    async gotoDetail() {
      if (!this.properties.commodity) {
        return;
      }
      await wx.navigateTo({
        url: `../commodity_detail/index?id=${this.properties.commodity._id}`
      })
    }
  },
  attached() {
    let { content } = this.properties.commodity
    // 处理content
    content = content.substring(0, 8); // 最多十个
    const firstLR = content.indexOf('\n');
    if (firstLR !== -1) {
      content = content.substring(0, content.indexOf('\n')) // 从第一个回车截断
    }
    this.setData({
      desc: content,
      ridToRegion: app.globalData.ridToRegion,
    })
  }
});
