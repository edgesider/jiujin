import api from './api/api';
import { BehaviorSubject } from "rxjs";

import { initConstants } from "./constants";

import { initMoment } from "./utils/time";
import { InAppMonitor } from "./monitor/index";
import { initOpenIM } from "./utils/oim";

App({
  _ready: false,
  _readyWaiters: [],
  globalData: {
    self: null,
    ridToRegion: null,
  },

  launchFailed: false,
  userChangedSubject: new BehaviorSubject(null),

  async onLaunch() {
    try {
      wx.cloud.init({ env: 'jj-4g1ndtns7f1df442', });

      initConstants();
      initMoment();

      const self = await this.fetchSelfInfo(); // 先拉selfInfo；如果没有session_key的话，会自动调用authorize
      await Promise.all([this.fetchRegions(), this.fetchCategories()]);

      if (self) {
        await initOpenIM(self);
      }

      console.warn('initialized. globalData=', this.globalData);
      this._ready = true;
      this._readyWaiters.forEach(waiter => waiter[0]());
      this._readyWaiters.length = 0;
    } catch (e) {
      console.error('app initialize failed');
      this.launchFailed = true;
      this._readyWaiters.forEach(waiter => waiter[1](e));
      this._readyWaiters.length = 0;
    }
  },

  async onShow() {
    await this.waitForReady();
    InAppMonitor.start();
  },
  onHide() {
    InAppMonitor.stop();
  },

  async fetchSelfInfo() {
    const { data: self } = await api.getSelfInfo();
    this.globalData.self = self;
    this.userChangedSubject.next(self);
    return self;
  },

  async fetchRegions() {
    const resp = await api.getRegions();
    if (resp.isError || (resp.data?.length ?? 0) === 0) {
      console.error(resp);
      throw Error('fetch regions failed');
    }
    const regions = resp.data ?? [];
    const ridToRegion = {};
    for (const region of regions) {
      ridToRegion[region._id] = region;
    }
    this.globalData.regions = regions;
    this.globalData.ridToRegion = ridToRegion;
  },

  async fetchCategories() {
    const resp = await api.getCategory();
    this.globalData.categories = resp.data ?? [];
  },

  async waitForReady() {
    if (this.launchFailed) {
      await this.onLaunch();
    }
    return new Promise((resolve, reject) => {
      if (this._ready) {
        resolve();
      } else {
        this._readyWaiters.push([resolve, reject]);
      }
    });
  }
})
