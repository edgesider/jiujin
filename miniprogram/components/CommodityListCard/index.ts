import { getContentDesc, getQualitiesMap } from '../../utils/strings';
import moment from 'moment';
import getConstants, {
  COMMODITY_STATUS_SOLD,
  COMMODITY_STATUS_DEACTIVATED, COMMODITY_STATUS_BOOKED, COMMODITY_POLISH_MIN_DURATION
} from '../../constants';
import { DATETIME_FORMAT } from '../../utils/time';
import { ViewsAPI } from '../../api/ViewsAPI';
import { ViewsInfo } from '../../types';
import { Subscription } from 'rxjs';

const app = getApp();

Component({
  properties: {
    commodity: {
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
      value: true,
    }
  },
  data: {
    ...getConstants(),
    self: null,
    desc: '',
    createTime: '',
    soldTime: '',
    polishAt: '',
    ridToRegion: app.globalData.ridToRegion,
    qualitiesMap: getQualitiesMap(),
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
    async polish() {
      this.triggerEvent('onPolish', {
        commodity: this.properties.commodity,
      })
    },
    deactivate() {
      this.triggerEvent('onDeactivate', {
        commodity: this.properties.commodity,
      })
    },
    activate() {
      this.triggerEvent('onActivate', {
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
      const { showStatusImage } = this.properties;
      const { content, create_time, polish_time, selled_time, status, _id } = this.properties.commodity
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
        soldTime: selled_time && moment(selled_time).format(DATETIME_FORMAT) || '',
        polishAt: moment(polish_time).fromNow(),
        ridToRegion: app.globalData.ridToRegion,
        statusImage: !showStatusImage ? null : ({
          [COMMODITY_STATUS_SOLD]: '/images/已成交.png',
          [COMMODITY_STATUS_BOOKED]: '/images/已预订.png',
          [COMMODITY_STATUS_DEACTIVATED]: '/images/已结束.png',
        })[status] ?? '',
        canPolishDuration: polish_time + COMMODITY_POLISH_MIN_DURATION - Date.now(),
        canPolish: Date.now() - polish_time > COMMODITY_POLISH_MIN_DURATION
      })
    },
  },
});
