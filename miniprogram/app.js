import api, { Axios } from './api/api';
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
    config: {
      userID: '', // User ID
      commodity: null,
      SDKAPPID: 1600027557, // Your SDKAppID
    },
    timInitialized: false,
    TUISDKReady: false,
    totalUnread: 0,
    targetCommodity: null,
    onUnreadCountUpdate: (count) => {},
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

      await initOpenIM(self);

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

  timeString() {
    const date = new Date();
    const hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    const secs = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return `${hours}:${minutes}:${secs}`;
  },

  // 发送订阅消息
  pushToUser(options) {
    const { access_token, touser, template_id, data } = options;
    Axios({
      url: `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`,
      data: {
        touser,
        template_id,
        data,
        page: 'index',
        miniprogram_state: 'developer',
        lang: 'zh_CN'
      },
      method: 'POST'
    }).then((res) => {
      console.log('pushToUser res.data ->', res.data);
    }).catch((error) => {
      console.log('pushToUser failed ->', error);
    });
  },

  sendIMSubscribeMessage(msg) {
    api.getAccessToken().then((res) => {
      const { access_token } = res.data;
      // 接入侧需处理腾讯云 IM userID，微信小程序 openID，订阅消息模板 ID 的映射关系
      this.pushToUser({
        access_token,
        touser: this.globalData.self._id,
        template_id: 'IHHmCTUl9XTY1PKLbQ9KBcrtuGEy836_8OqBAeZyuqg',
        data: {
          name1: {
            value: msg.name,
          },
          thing2: {
            value: msg.message,
          },
          time3: {
            value: msg.time,
          },
          thing10: {
            value: msg.commodity,
          },
        }
      });
    });
  },

  decodeReplyID(replyID) {
    return {
      openid: replyID.substr(4, 32),
      commodity: replyID.substr(32),
    }
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
