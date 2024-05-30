// pages/help_list/index.ts
import getConstants, {
  HELP_STATUS_RUNNING,
  HELP_STATUS_FINISHED, HELP_STATUS_RESOLVED, HELP_STATUS_RESOLVING
} from "../../constants";
import { getContentDesc, getQualitiesMap } from "../../utils/strings";
import { DATETIME_FORMAT } from "../../utils/time";
import moment from 'moment';

const app = getApp();
Component({
  properties: {
    help: {
      type: Object,
    },
    type: {
      type: String,
      value: 'mine', // mine | bought | viewed
    },
    showStatusImage: {
      type: Boolean,
      value: false,
    },
  },
  data: {
    ...getConstants(),
    self: null,
    desc: '',
    createTime: '',
    polishAt: '',
    ridToRegion: app.globalData.ridToRegion,
    statusImage: '',
  },
  methods: {
    async gotoHelpDetail() {
      this.triggerEvent('onClickCard', {
        help: this.properties.help,
      });
    },
    delete() {
      this.triggerEvent('onDelete', {
        help: this.properties.help,
      })
    },
    polish() {
      this.triggerEvent('onPolish', {
        help: this.properties.help,
      })
    },
    deactivate() {
      this.triggerEvent('onDeactivate', {
        help: this.properties.help,
      })
    },
    gotoEdit() {
      this.triggerEvent('onEdit', {
        help: this.properties.help,
      })
    },
    onUpdate() {
      const { showStatusImage } = this.properties;
      const { content, create_time, update_time, status } = this.properties.help
      this.setData({
        self: app.globalData.self,
        desc: getContentDesc(content, 40),
        createTime: moment(create_time).format(DATETIME_FORMAT),
        polishAt: moment(update_time).fromNow(),
        ridToRegion: app.globalData.ridToRegion,
        statusImage: !showStatusImage ? null : ({
          [HELP_STATUS_RESOLVED]: '/images/已解决.png',
          [HELP_STATUS_RESOLVING]: '/images/解决中.png',
          [HELP_STATUS_FINISHED]: '/images/已完成.png',
        })[status] ?? '',
      })
    },
  },
  attached() {
    this.onUpdate();
  },
  observers: {
    help() {
      this.onUpdate();
    }
  },
})