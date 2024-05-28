import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { waitForAppReady } from '../../utils/globals';

const app = getApp()

Page({
  data: {
    ...getConstants(),
    src: '',
  },
  _subscription: null as Subscription | null,
  async onLoad(options) {
    await waitForAppReady();
    this._subscription = new Subscription();

    const { src } = options;
    this.setData({ src });
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  }
})