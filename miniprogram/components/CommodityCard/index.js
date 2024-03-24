import { getContentDesc, getQualitiesMap } from "../../utils/strings";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
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
    },
    async onLongPress() {
      const { tapIndex } = await wx.showActionSheet({
        itemList: ['举报']
      });
      if (tapIndex === 0) {
        await wx.showToast({ title: '已举报' });
      }
    }
  },
  attached() {
    const { content } = this.properties.commodity
    this.setData({
      desc: getContentDesc(content),
      ridToRegion: app.globalData.ridToRegion,
    });
  }
});
