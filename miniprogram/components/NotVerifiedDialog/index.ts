import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { getCurrentPage, setTabBar } from '../../utils/other';
import { openVerify } from '../../utils/router';

Component({
  properties: {
    pos: {
      type: String,
      value: 'center' // center | bottom
    },
  },
  data: {
    ...getConstants(),
    show: false,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      const page = getCurrentPage();
      const hasTabBar = page.getTabBar();
      this.setData({ hasTabBar });
      page.__not_verified_dialog = this;
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
    },
    hide() {
      this.setData({ show: false });
    },
    async onClickVerify() {
      this.triggerEvent('onClickGotoVerify');
      await openVerify();
    },
    onClickMask() {
      console.log('onclickmask');
      this.hide();
    }
  }
});
