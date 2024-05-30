import api from "../api/api";
import * as rxjs from "rxjs";

/**
 * 监听App是否展示
 */
export const InAppMonitor = {
  _TAG: 'InAppMonitor',
  _INTERVAL: 1000 * 10,
  _subj: rxjs.Subscription.EMPTY,
  _action() {
    if (!getApp()?.globalData.self) {
      return;
    }
    api.updateLastSeenTime().then();
    console.log(`${this._TAG}: in_app=true`);
  },
  start() {
    console.log(`${this._TAG}: start`);
    this._subj.unsubscribe();
    this._action();
    this._subj = rxjs
      .interval(this._INTERVAL)
      .subscribe(() => {
        this._action();
      });
  },
  stop() {
    console.log(`${this._TAG}: stop`);
    this._subj.unsubscribe();
  },
}