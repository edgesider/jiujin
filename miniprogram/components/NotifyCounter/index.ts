import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import {
  getNotifyCount, getNotifyStates,
  getNotifySwitches, NotifySubscribeState,
  NotifyType, requestNotifySubscribes, syncNotifyStates,
} from '../../utils/notify';

type TouchEvent = WechatMiniprogram.TouchEvent;

Component({
  properties: {
    types: {
      type: Array,
      value: [NotifyType.Message, NotifyType.Comment]
    }
  },
  data: {
    ...getConstants(),
    states: [] as NotifySubscribeState[],
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.update();
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
    async update() {
      this.setData({ states: Object.values(getNotifyStates()) });
      this.setData({ states: Object.values(await syncNotifyStates()) });
    },
    async onAddClick(ev: TouchEvent) {
      const type = ev.currentTarget.dataset.type as NotifyType;
      wx.showLoading({ mask: true, title: '请稍等' });
      await requestNotifySubscribes([type]);
      this.setData({
        states: Object.values(getNotifyStates()),
      })
      wx.hideLoading();
    },
    async onMaskClick() {
      this.triggerEvent('onDismiss');
    },
  }
});
