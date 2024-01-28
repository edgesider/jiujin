import { getQualitiesMap } from "../../utils/strings";
import moment from "moment";

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
    createTime: '',
    polishAt: '',
    ridToRegion: app.globalData.ridToRegion,
    qualitiesMap: getQualitiesMap(),
  },
  methods: {
    async gotoDetail() {
      if (!this.properties.commodity) {
        return;
      }
      await wx.navigateTo({
        url: `../commodity_detail/index?commodity=${encodeURIComponent(JSON.stringify(this.properties.commodity))}`
      })
    },
    polish() {
      this.triggerEvent('onPolish', {
        commodity: this.properties.commodity,
      })
    },
    cancel() {
      this.triggerEvent('onCancel', {
        commodity: this.properties.commodity,
      })
    },
    gotoEdit() {
      this.triggerEvent('onEdit', {
        commodity: this.properties.commodity,
      })
    },
    republish() {
      this.triggerEvent('onRepublish', {
        commodity: this.properties.commodity,
      })
    },

    onUpdate() {
      let { content, create_time, update_time } = this.properties.commodity
      // 处理content
      content = content.substring(0, 8); // 最多十个
      const firstLR = content.indexOf('\n');
      if (firstLR !== -1) {
        content = content.substring(0, content.indexOf('\n')) // 从第一个回车截断
      }
      this.setData({
        desc: content,
        createTime: new Date(create_time).toLocaleDateString(),
        polishAt: moment(update_time).fromNow(),
        ridToRegion: app.globalData.ridToRegion,
      })
    },
  },
  attached() {
    this.onUpdate();
  },
  observers: {
    commodity() {
      this.onUpdate();
    }
  },
});
