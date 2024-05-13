import { getContentDesc } from "../../utils/strings";
import { getRegionPathName } from "../../utils/other";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
    },
    currRegionLevel: {
      type: Number,
      value: 1,
      observer() {
        this.update();
      }
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
    },
    update() {
      const { currRegionLevel = 1 } = this.properties;
      const { content, rid } = this.properties.commodity;
      this.setData({
        desc: getContentDesc(content),
        regionName: getRegionPathName(
          rid,
          currRegionLevel + 1 // 最多展示到当前级别的下一级
        ) || '楼里', // 没有要展示的就展示“楼里”
      });
    },
  },
  attached() {
    this.update();
  }
});
