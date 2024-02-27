import api from './api/api';
import cache from "./cache/cache"
import { BehaviorSubject } from "rxjs";
import moment from "moment";

import TencentCloudChat from '@tencentcloud/chat';
import TIMUploadPlugin from 'tim-upload-plugin';
import TIMProfanityFilterPlugin from 'tim-profanity-filter-plugin';
import { GENDER } from "./constants";

import axios from 'axios';
import adapter from 'axios-wechat-adapter';

const IMAxios = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
  },
});

App({
  _ready: false,
  _readyWaiters: [],
  globalData: {
    registered: false,
    self: null,
    ridToRegion: null,
    StatusBar: 0,
    CustomBar: 0,
    config: {
      userID: '', // User ID
      commodity: null,
      SDKAPPID: 1600012697, // Your SDKAppID
    },
    TUIEnabled: false,
    TUISDKReady: false,
    totalUnread: 0,
    currentUser: null,
    targetID: null,
  },

  userChangedSubject: new BehaviorSubject(null),

  async onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'jj-4g1ndtns7f1df442',
        // traceUser: true,
      })
    }

    // Color UI: 获得系统信息
    wx.getSystemInfo({
      success: e => {
        this.globalData.StatusBar = e.statusBarHeight;
        let custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    })

    moment.locale('zh-cn');

    const { data: { openId } } = await api.getOpenId();
    this.globalData.openId = openId;

    // 清空缓存
    wx.clearStorageSync();
    // TODO 存到storage中
    await Promise.all([this.fetchSelfInfo(), this.fetchRegions()]);

    // 登录腾讯IM
    await this.initTIM();
    this.globalData.totalUnread = wx.$TUIKit.getTotalUnreadMessageCount();

    console.log('initialized. globalData=', this.globalData);
    this._ready = true;
    this._readyWaiters.forEach(waiter => waiter());
  },

  async initTIM() {
    if (this.globalData.TUIEnabled) {
      console.error('私信重复登录！');
      return { errno: -1 };
    }
    this.globalData.config.userID = 'USER' + this.globalData.openId;
    console.log('私信登录ID: ', this.globalData.config.userID);

    wx.TencentCloudChat = TencentCloudChat;
    wx.$TUIKit = TencentCloudChat.create({
      SDKAppID: this.globalData.config.SDKAPPID,
    });

    wx.$TUIKit.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin });
    wx.$TUIKit.registerPlugin({ 'tim-profanity-filter-plugin': TIMProfanityFilterPlugin });

    // 监听系统级事件
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, this.onSDKReady, this);
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.TOTAL_UNREAD_MESSAGE_COUNT_UPDATED, this.onTotalUnreadMessageCountUpdated, this);
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this.onMessageReceived, this);

    await this.loginIMWithID(this.globalData.config.userID);

    wx.$TUIKit.updateMyProfile({
      nick: this.globalData.self.name,
      avatar: this.globalData.self.avatar_url,
      gender: {
        [GENDER.UNKNOWN]: wx.TencentCloudChat.TYPES.GENDER_UNKNOWN,
        [GENDER.MALE]: wx.TencentCloudChat.TYPES.GENDER_MALE,
        [GENDER.FEMALE]: wx.TencentCloudChat.TYPES.GENDER_FEMALE,
      }[this.globalData.self.sex] ?? wx.TencentCloudChat.TYPES.GENDER_UNKNOWN,
      allowType: wx.TencentCloudChat.TYPES.ALLOW_TYPE_ALLOW_ANY
    }).then((imResponse) => {
      console.log(imResponse.data); // 更新资料成功
    }).catch((imError) => {
      console.warn('更新个人资料错误： ', imError); // 更新资料失败的相关信息
    });

    this.globalData.TUIEnabled = true;
  },

  async loginIMWithID(id) {
    console.warn('用户登录ID: ' + id);

    if (wx.$TUIKit.getLoginUser() == id) {
      return;
    }

    if (wx.$TUIKit.getLoginUser() != '') {
      await wx.$TUIKit.logout();
    }

    this.globalData.TUISDKReady = false;
    this.globalData.config.userID = id;

    console.log("生成用户聊天ID");
    var result = await api.genUserSig(id);
    console.log('result', result);
    if (result.errno == -1) {
      console.log("生成用户聊天ID失败！")
      return new RespError("生成用户聊天ID失败！")
    }
    const userSig = result.data.userSig;
    console.log("用户SIG：", userSig);

    wx.$chat_SDKAppID = this.globalData.config.SDKAPPID;
    wx.$chat_userID = this.globalData.config.userID;
    wx.$chat_userSig = userSig;
    wx.$TUIKit.login({
      userID: this.globalData.config.userID,
      userSig
    });

    return new Promise((ok) => {
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, ok, this);
    });
  },

  onSDKReady(event) {
    // 监听到此事件后可调用 SDK 发送消息等 API，使用 SDK 的各项功能。
    console.log("TencentCloudChat SDK_READY");
    this.globalData.TUISDKReady = true;
  },

  onTotalUnreadMessageCountUpdated(event) {
    console.log("TencentCloudChat TOTAL_UNREAD_MESSAGE_COUNT_UPDATED");
    console.log(event.data);
    this.globalData.totalUnread = event.data;
  },

  onMessageReceived(event) {
    console.log(event.data);
  },

  getAccessToken() {
    let APPID = 'wxc89ea56f592e89c4';
    // 注意：仅用于测试，上线时需要转移至后端
    const SECRETKEY = '0e3f256c7f3e15d4f1d29ea274d8f5e1572a73f4ef2ab9e8d8d7e6c2525f737c';
    let url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRETKEY}`;
    return new Promise(function(resolve, reject) {
      IMAxios({
        url: url,
        method: 'GET'
      }).then((res) => {
        console.log('getAccessToken res.data ->', res.data);
        resolve(accessToken);
      }).catch((error) => {
        console.log('getAccessToken failed ->', error);
        reject({ errno: -1, error });
      });
    });
  },

  // 发送订阅消息
  pushToUser(options) {
    console.log('pushToUser options ->', options);
    const { access_token, touser, template_id, data } = options;
    IMAxios({
      url: `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${access_token}`,
      data: {
        touser, // 接收者（用户）的 openID
        template_id, // 所需下发的订阅模板 ID
        data, // 模板内容，格式形如 { "key1": { "value": any }, "key2": { "value": any } }
      },
      method: 'POST'
    }).then((res) => {
      console.log('pushToUser res.data ->', res.data);
    }).catch((error) => {
      console.log('pushToUser failed ->', error);
    });
  },

  sendIMSubscribeMessage(msg) {
    getAccessToken().then((accessToken) => {
      // 接入侧需处理腾讯云 IM userID，微信小程序 openID，订阅消息模板 ID 的映射关系
      pushToUser({
        access_token: accessToken,
        touser: this.self._id,
        template_id: 'IHHmCTUl9XTY1PKLbQ9KBcrtuGEy836_8OqBAeZyuqg',
        // 模板数据格式跟用户选择的模板有关，以下数据结构仅供参考
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

  decodeReplyID(replyID){
    return {
      openid: replyID.substr(4, 32),
      commodity: replyID.substr(32),
    }
  },

  async fetchSelfInfo() {
    // 查询用户是否已经注册
    const res = await api.getSelfInfo();
    const registered = !!res.data?._id;
    this.globalData.registered = registered;
    if (registered) {
      this.userChangedSubject.next(res.data);
      this.globalData.self = res.data;
    }
  },

  async fetchRegions() {
    const { data: regions } = await api.getRegions() ?? [];
    const ridToRegion = {};
    for (const region of regions) {
      ridToRegion[region._id] = region;
    }
    this.globalData.ridToRegion = ridToRegion;
  },

  async waitForReady() {
    return new Promise(resolve => {
      if (this._ready) {
        resolve();
      } else {
        this._readyWaiters.push(resolve);
      }
    });
  }
})
