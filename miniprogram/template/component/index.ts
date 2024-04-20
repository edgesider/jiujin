import getConstants from "../../constants";
import { Subscription } from 'rxjs';

Component({
  properties: {
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
    }
  }
});
