import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import {
  getNotifyStates,
  NotifySubscribeState, NotifySubscribeStates,
  NotifyType, requestNotifySubscribes, syncNotifyStates,
} from '../../utils/notify';
import { metric } from '../../utils/metric';

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
    adding: false,
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
      if (this.data.states.length === 0) {
        this.updateStates(getNotifyStates());
      }
      this.updateStates(await syncNotifyStates());
    },
    updateStates(states: NotifySubscribeStates) {
      this.setData({ states: this.properties.types.map(t => states[t]).filter(Boolean) });
    },
    async onAddClick(ev: TouchEvent) {
      if (this.data.adding) {
        return;
      }
      this.setData({ adding: true });
      const type = ev.currentTarget.dataset.type as NotifyType;
      const startAt = Date.now();
      await requestNotifySubscribes([type]);
      this.updateStates(getNotifyStates());
      const duration = Date.now() - startAt;
      metric.write('added_subscribe', { duration }, { type: NotifyType[type] });
      this.setData({ adding: false });
    },
    async onMaskClick() {
      this.triggerEvent('onDismiss');
    },
  }
});
