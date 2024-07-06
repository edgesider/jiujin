import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import {
  listenNotifyStatesChanged, NotifySubscribeState, NotifyType,
} from '../../utils/notify';
import { openNotifyCounterDialog } from '../../utils/router';

Component({
  properties: {},
  data: {
    ...getConstants(),
    state: null as NotifySubscribeState | null,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.getSubscription().add(listenNotifyStatesChanged().subscribe(states => {
        this.setData({
          state: states[NotifyType.Message]
        });
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
    onAdd() {
      openNotifyCounterDialog();
    },
    gotoNotifySetting() {
      wx.openSetting();
    },
  }
});
