import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { DialogHelper } from '../../utils/router';

Component({
  properties: {},
  data: {
    ...getConstants(),
    show: false,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
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
    onShareDismissClick() {
      DialogHelper.closeSelf(this);
    },
  }
});
