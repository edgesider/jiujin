import { getContentDesc, getQualitiesMap } from "../../utils/strings";
import { getRegionPath } from "../../utils/other";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
    },
    showRegionLevel: {
      type: Number,
      value: 0,
    }
  },
  data: {
    desc: '',
    regionName: '',
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
    const { showRegionLevel } = this.properties;
    const { content, rid } = this.properties.commodity;
    const path = getRegionPath(rid).splice(0, showRegionLevel + 1).map(r => r.name);
    path.reverse();
    this.setData({
      desc: getContentDesc(content),
      regionName: path.length > 0 ? path.join('/') : '楼里', // 没有要展示的就展示“楼里”
    });
  }
});
