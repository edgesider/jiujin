import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { waitForAppReady } from '../../utils/globals';
import { decodeOptions } from '../../utils/strings';

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

    options = decodeOptions(options);
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