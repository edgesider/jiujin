import { getQualitiesMap } from "../../utils/strings";
import moment from "moment";
import { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SOLD, COMMODITY_STATUS_SELLING } from "../../constants";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      default: 'mine', // mine | bought | viewed
    }
  },
  data: {
    COMMODITY_STATUS_SELLING,
    COMMODITY_STATUS_OFF,
    COMMODITY_STATUS_SOLD,
    desc: '',
    createTime: '',
    soldTime: '',
    polishAt: '',
    ridToRegion: app.globalData.ridToRegion,
    qualitiesMap: getQualitiesMap(),
  },
  methods: {
    async gotoDetail() {
      this.triggerEvent('onClickCard', {
        commodity: this.properties.commodity,
      });
    },
    delete() {
      this.triggerEvent('onDelete', {
        commodity: this.properties.commodity,
      })
    },
    polish() {
      this.triggerEvent('onPolish', {
        commodity: this.properties.commodity,
      })
    },
    off() {
      this.triggerEvent('onOff', {
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
      let { content, create_time, update_time, selled_time } = this.properties.commodity
      // 处理content
      content = content.substring(0, 8); // 最多十个
      const firstLR = content.indexOf('\n');
      if (firstLR !== -1) {
        content = content.substring(0, content.indexOf('\n')) // 从第一个回车截断
      }
      this.setData({
        desc: content,
        createTime: new Date(create_time).toLocaleString(),
        soldTime: selled_time && new Date(selled_time).toLocaleString() || '',
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
