import { getContentDesc, getQualitiesMap } from "../../utils/strings";
import { getRegionPath, getRegionPathName } from "../../utils/other";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
    },
    showRegionLevel: {
      type: Number,
      value: 1
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
    const { showRegionLevel = 1 } = this.properties;
    const { content, rid } = this.properties.commodity;
    this.setData({
      desc: getContentDesc(content),
      regionName: getRegionPathName(
        rid,
        showRegionLevel + 1 // 最多展示到当前级别的下一级
      ) || '楼里', // 没有要展示的就展示“楼里”
    });
  }
});
