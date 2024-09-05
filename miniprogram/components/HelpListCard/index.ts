// pages/help_list/index.ts
import getConstants, {
  HELP_STATUS_RUNNING,
  HELP_STATUS_FINISHED, HELP_STATUS_RESOLVED, HELP_STATUS_RESOLVING, HELP_POLISH_MIN_DURATION
} from "../../constants";
import { getContentDesc, getQualitiesMap } from "../../utils/strings";
import { DATETIME_FORMAT } from "../../utils/time";
import moment from 'moment';
import { ViewsInfo } from '../../types';
import { Subscription } from 'rxjs';
import { ViewsAPI } from '../../api/ViewsAPI';

const app = getApp();
Component({
  properties: {
    help: {
      type: Object,
      observer() {
        this.onUpdate();
      }
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
    canPolish: false,
    canPolishDuration: 0,
    viewsInfo: null as ViewsInfo | null,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.onUpdate();
      this.getSubscription().add(app.userChangedSubject.subscribe(user => {
        this.setData({ self: user });
        this.onUpdate();
      }));
    },
    detached() {
      this.getSubscription().unsubscribe();
    }
  },
  methods: {
    getSubscription(): Subscription {
      // @ts-ignore
      return this._subscription as Subscription;
    },
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
    polish(ev) {
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
      const { content, create_time, polish_time, status, _id } = this.properties.help
      ViewsAPI.getViewsInfo(_id).then(viewsInfo => {
        if (viewsInfo.isError) {
          console.error('failed to getViewsInfo', viewsInfo.message);
          return;
        }
        this.setData({ viewsInfo: viewsInfo.data })
      });
      this.setData({
        self: app.globalData.self,
        desc: getContentDesc(content, 40),
        createTime: moment(create_time).format(DATETIME_FORMAT),
        polishAt: moment(polish_time).fromNow(),
        ridToRegion: app.globalData.ridToRegion,
        statusImage: !showStatusImage ? null : ({
          [HELP_STATUS_RESOLVED]: '/images/已解决.png',
          [HELP_STATUS_RESOLVING]: '/images/解决中.png',
          [HELP_STATUS_FINISHED]: '/images/已结束.png',
        })[status] ?? '',
        canPolishDuration: polish_time + HELP_POLISH_MIN_DURATION - Date.now(),
        canPolish: Date.now() - polish_time > HELP_POLISH_MIN_DURATION
      })
    },
  },
})