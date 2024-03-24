import { getContentDesc, getQualitiesMap } from "../../utils/strings";
import moment from 'moment';
import { COMMODITY_STATUS_OFF, COMMODITY_STATUS_SOLD, COMMODITY_STATUS_SELLING } from "../../constants";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
    },
    type: {
      type: String,
      value: 'mine', // mine | bought | viewed
    }
  },
  data: {
    COMMODITY_STATUS_SELLING,
    COMMODITY_STATUS_OFF,
    COMMODITY_STATUS_SOLD,
    self: null,
    desc: '',
    createTime: '',
    soldTime: '',
    polishAt: '',
    ridToRegion: app.globalData.ridToRegion,
    qualitiesMap: getQualitiesMap(),
    statusImage: '',
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
      const { content, create_time, update_time, selled_time, status } = this.properties.commodity
      this.setData({
        self: app.globalData.self,
        desc: getContentDesc(content),
        createTime: moment(create_time).format('YYYY-MM-DD HH:mm'),
        soldTime: selled_time && moment(selled_time).format('YYYY-MM-DD HH:mm') || '',
        polishAt: moment(update_time).fromNow(),
        ridToRegion: app.globalData.ridToRegion,
        statusImage: ({
          [COMMODITY_STATUS_SOLD]: '/images/已成交.png',
          [COMMODITY_STATUS_SELLING]: '/images/未成交.png',
          [COMMODITY_STATUS_OFF]: '/images/已结束.png',
        })[status]
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
