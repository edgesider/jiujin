import api, { Axios } from './api/api';
import { BehaviorSubject } from "rxjs";

import TencentCloudChat from '@tencentcloud/chat';
import TIMUploadPlugin from 'tim-upload-plugin';
import TIMProfanityFilterPlugin from 'tim-profanity-filter-plugin';
import { GENDER, initConstants } from "./constants";

import { initMoment } from "./utils/time";
import { InAppMonitor } from "./monitor/index";
import { getImUidFromUid, initTim } from "./utils/im";

App({
  _ready: false,
  _readyWaiters: [],
  globalData: {
    self: null,
    ridToRegion: null,
    StatusBar: 0,
    CustomBar: 0,
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

      await this.fetchSelfInfo(); // 先拉selfInfo；如果没有session_key的话，会自动调用authorize
      await Promise.all([this.fetchRegions(), this.fetchCategories()]);

      // 登录腾讯IM
      await this.initTIM();

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

  async initTIM() {
    globalThis.tim = Object.assign(
      TencentCloudChat.create({
        SDKAppID: this.globalData.config.SDKAPPID,
      }),
      TencentCloudChat
    );

    if (this.globalData.timInitialized) {
      console.error('私信重复登录！');
      return { errno: -1 };
    }

    const { self } = this.globalData;
    if (!this.globalData.self) {
      return;
    }
    this.globalData.config.userID = self._id;
    tim.setLogLevel(1);
    tim.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin });
    tim.registerPlugin({ 'tim-profanity-filter-plugin': TIMProfanityFilterPlugin });

    // 监听系统级事件
    tim.on(tim.EVENT.SDK_READY, this.onSDKReady, this);

    await this.loginIMWithID(this.globalData.self._id);
    initTim(self); // TODO 都挪到外面

    await tim.updateMyProfile({
      nick: this.globalData.self.name,
      avatar: this.globalData.self.avatar_url,
      gender: {
        [GENDER.UNKNOWN]: tim.TYPES.GENDER_UNKNOWN,
        [GENDER.MALE]: tim.TYPES.GENDER_MALE,
        [GENDER.FEMALE]: tim.TYPES.GENDER_FEMALE,
      }[this.globalData.self.sex] ?? tim.TYPES.GENDER_UNKNOWN,
      allowType: tim.TYPES.ALLOW_TYPE_ALLOW_ANY
    })

    this.globalData.timInitialized = true;
    this.globalData.totalUnread = tim.getTotalUnreadMessageCount();
  },

  async loginIMWithID(id) {
    if (tim.getLoginUser() === id) {
      return;
    }

    if (tim.getLoginUser() !== '') {
      await tim.logout();
    }

    const user_id = getImUidFromUid(id);

    this.globalData.TUISDKReady = false;
    this.globalData.config.userID = user_id;

    const sigResp = await api.genUserSig(user_id);
    if (sigResp.isError) {
      return new Error("生成用户聊天ID失败！");
    }
    const userSig = sigResp.data;

    wx.$chat_SDKAppID = this.globalData.config.SDKAPPID;
    wx.$chat_userID = user_id;
    wx.$chat_userSig = userSig;
    await tim.login({
      userID: user_id,
      userSig
    });

    return new Promise((ok) => {
      tim.on(tim.EVENT.SDK_READY, ok, this);
    });
  },

  async onSDKReady(event) {
    // 监听到此事件后可调用 SDK 发送消息等 API，使用 SDK 的各项功能。
    this.globalData.TUISDKReady = true;
    this.globalData.totalUnread = tim.getTotalUnreadMessageCount();
    this.globalData.onUnreadCountUpdate(this.globalData.totalUnread);
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
