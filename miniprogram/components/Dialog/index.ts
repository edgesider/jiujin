import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { getCurrentPage } from '../../utils/other';
import { DialogHelper, DialogType } from '../../utils/router';

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
    },
    contentAlign: {
      type: String,
      value: 'left', // left/right/center
    },
    // okButton: {
    //   value: '',
    //   type: String,
    // },
    // cancelButton: {
    //   value: '',
    //   type: String,
    // },
  },
  data: {
    ...getConstants(),
    show: false,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.getOwner().__dialog = this; // 将自己绑定在父组件上
      const page = getCurrentPage();
      const { type } = this.properties;
      if (type === DialogType.Unknown || typeof type !== 'number' || !(type in DialogType)) {
        throw Error(`cannot register dialog type ${type}`);
      }
      DialogHelper.initDialog(this);
      const hasTabBar = page.getTabBar();
      this.setData({ hasTabBar });
    },
    detached() {
      this.getSubscription().unsubscribe();
      DialogHelper.clearDialog(this);
    }
  },
  methods: {
    getSubscription(): Subscription {
      // @ts-ignore
      return this._subscription as Subscription;
    },
    getOwner() {
      return this.selectOwnerComponent();
    },
    show(callback: () => {}) {
      if (this.data.show) {
        throw Error(`dialog ${DialogType[this.properties.type]} is showing`);
      }
      // @ts-ignore
      this.__callback = callback;
      this.getOwner().onDialogShow?.();
      this.setData({ show: true });
    },
    async hide() {
      // @ts-ignore
      await this.__callback();
      this.getOwner().onDialogHide?.();
      this.setData({ show: false });
    },
    async onMaskClick() {
      this.hide();
    },
  }
});
