import getConstants from "../../constants";
import { Subscription } from "rxjs";

const app = getApp()

Page({
  data: {
    ...getConstants(),
  },
  _subscription: null as Subscription | null,
  onLoad() {
    this._subscription = new Subscription();
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  }
})