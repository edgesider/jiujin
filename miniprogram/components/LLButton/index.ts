import getConstants from '../../constants';
import { Subscription } from 'rxjs';

Component({
  properties: {
    color: {
      // green/yellow/greenyellow
      type: String,
      value: 'green'
    },
    text: {
      type: String
    },
    disabled: {
      type: Boolean,
      value: false
    },
    suffixIcon: {
      type: String,
    },
    share: {
      type: Boolean,
      value: false,
    }
  },
  data: {
    ...getConstants(),
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
  }
});
