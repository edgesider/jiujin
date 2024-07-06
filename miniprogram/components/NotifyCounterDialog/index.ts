import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import {
  getNotifyStates, listenNotifyStatesChanged,
  NotifySubscribeState, NotifySubscribeStates,
  NotifyType, requestNotifySubscribes, syncNotifyStates,
} from '../../utils/notify';
import { metric } from '../../utils/metric';
import { getCurrentPage, toastLoading, toastLoadingHide } from '../../utils/other';

type TouchEvent = WechatMiniprogram.TouchEvent;

Component({
  properties: {
    types: {
      type: Array,
      value: [NotifyType.Message]
    }
  },
  data: {
    ...getConstants(),
    show: false,
    states: [] as NotifySubscribeState[],
    adding: false,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      const page = getCurrentPage();
      const hasTabBar = page.getTabBar();
      this.setData({ hasTabBar });
      page.__notify_counter_dialog = this;
      this.getSubscription().add(listenNotifyStatesChanged().subscribe(states => {
        this.updateStates(states);
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
    show() {
      this.setData({ show: true });
      this.update();
    },
    async update() {
      this.updateStates(getNotifyStates());
      this.updateStates(await syncNotifyStates());
    },
    updateStates(states: NotifySubscribeStates) {
      this.setData({ states: this.properties.types.map(t => states[t]).filter(Boolean) });
    },
    async onAddClick(ev: TouchEvent) {
      if (this.data.adding) {
        return;
      }
      toastLoading('请稍后');
      this.setData({ adding: true });
      const type = ev.currentTarget.dataset.type as NotifyType;
      const startAt = Date.now();
      await requestNotifySubscribes([type]);
      this.updateStates(getNotifyStates());
      toastLoadingHide();
      const duration = Date.now() - startAt;
      metric.write('added_subscribe', { duration }, { type: NotifyType[type] });
      this.setData({ adding: false });
    },
    async onMaskClick() {
      // this.triggerEvent('onDismiss');
      this.setData({
        show: false,
      });
    },
  }
});
