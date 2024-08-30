import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { getCurrentPage } from '../../utils/other';
import { DialogType, getDialogKey } from '../../utils/router';

Component({
  properties: {
    type: {
      value: DialogType.Unknown,
      type: Number,
    },
    title: {
      value: '',
      type: String,
    },
    content: {
      value: '',
      type: String,
    }
  },
  data: {
    ...getConstants(),
    show: false,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.selectOwnerComponent().__dialog = this;
      const page = getCurrentPage();
      const { type } = this.properties;
      if (type === DialogType.Unknown || typeof type !== 'number' || !(type in DialogType)) {
        throw Error(`cannot register dialog type ${type}`);
      }
      page[getDialogKey(this.properties.type)] = this;
      const hasTabBar = page.getTabBar();
      this.setData({ hasTabBar });
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
    show(callback: () => {}) {
      // @ts-ignore
      this.__callback = callback;
      this.setData({ show: true });
    },
    hide() {
      // @ts-ignore
      this.__callback();
      this.setData({ show: false });
    },
    async onMaskClick() {
      this.hide();
    },
  }
});
