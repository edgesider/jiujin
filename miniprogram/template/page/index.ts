import getConstants from "../../constants";
import { Subscription } from "rxjs";
import { waitForAppReady } from '../../utils/globals';

const app = getApp()

Page({
  data: {
    ...getConstants(),
  },
  _subscription: null as Subscription | null,
  async onLoad() {
    await waitForAppReady();
    this._subscription = new Subscription();
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  }
})