// pages/help_list/index.ts
import getConstants, {
  HELP_STATUS_RUNNING,
  HELP_STATUS_FINISHED
} from "../../constants";
import { getContentDesc, getQualitiesMap } from "../../utils/strings";
import { DATETIME_FORMAT } from "../../utils/time";
import moment from 'moment';

const app = getApp();
Component({
  properties:{
    help:{
      type: Object,
    },
    type: {
      type: String,
      value: 'mine', // mine | bought | viewed
    }
  },
  data: {
    ...getConstants(),
    self: null,
    desc: '',
    createTime: '',
    ridToRegion: app.globalData.ridToRegion,
    statusImage: '',
  },
  methods:{
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
      const { content, create_time, update_time, status } = this.properties.help
      this.setData({
        self: app.globalData.self,
        desc: getContentDesc(content, 40),
        createTime: moment(create_time).format(DATETIME_FORMAT),
        polishAt: moment(update_time).fromNow(),
        ridToRegion: app.globalData.ridToRegion,
        statusImage: ({
          [HELP_STATUS_FINISHED]: '/images/已完成.png',
        })[status]
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