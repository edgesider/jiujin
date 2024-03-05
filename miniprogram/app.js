import api from './api/api';
import { BehaviorSubject } from "rxjs";

import TencentCloudChat from '@tencentcloud/chat';
import TIMUploadPlugin from 'tim-upload-plugin';
import TIMProfanityFilterPlugin from 'tim-profanity-filter-plugin';
import { GENDER, setConstants } from "./constants";

import axios from 'axios';
import { initMoment } from "./utils/time";
import { InAppMonitor } from "./monitor/index";

const IMAxios = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});

App({
  _ready: false,
  _readyWaiters: [],
  globalData: {
    registered: false,
    openId: null,
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
    targetCommodity: null,
    onUnreadCountUpdate: (count) => {},
  },

  userChangedSubject: new BehaviorSubject(null),

  async onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'jj-4g1ndtns7f1df442',
      })
    }

    wx.getSystemInfo({
      success: e => {
        const menuBtn = wx.getMenuButtonBoundingClientRect();
        // 系统状态栏高度
        const StatusBar = e.statusBarHeight;
        // 自定义顶栏高度
        const CustomBar = (menuBtn.top - e.statusBarHeight) * 2 + menuBtn.height;
        // 底部导航栏高度
        const TabBarHeight = 52;
        // 底部指示器高度（小白条）
        const BottomIndicatorHeight = e.safeArea ? (e.screenHeight - e.safeArea?.bottom ?? 0) : 0;
        const constants = Object.freeze({
          StatusBar,
          CustomBar,
          TabBarHeight,
          MenuButton: menuBtn,
          ScreenSize: [e.screenWidth, e.screenHeight],
          SafeArea: e.safeArea,
          TopBarHeight: StatusBar + CustomBar,
          BottomBarHeight: BottomIndicatorHeight + TabBarHeight,
          BottomIndicatorHeight,
        });
        Object.assign(this.globalData, constants)
        setConstants(constants)
      }
    })

    initMoment();

    this.globalData.openId = await this.userLogin();
    await Promise.all([this.fetchSelfInfo(), this.fetchRegions(), this.fetchCategories()]);

    // 登录腾讯IM
    await this.initTIM();
    this.globalData.totalUnread = wx.$TUIKit.getTotalUnreadMessageCount();

    console.warn('initialized. globalData=', this.globalData);
    this._ready = true;
    this._readyWaiters.forEach(waiter => waiter());
  },

  onShow() {
    InAppMonitor.start();
  },
  onHide() {
    InAppMonitor.stop();
  },

  async userLogin(){
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          api.userLogin(res.code).then((res) => {
            resolve(res.data);
          }).catch((err) => {
            console.error(`ERROR: ${err}`);
            reject(err);
          })
        },
        fail: (res) => {
          const { errMsg, errno } = res;
          console.error(`微信登录错误，错误码${errno}：${errMsg}`);
          wx.showToast({
            title: "微信登录错误",
            icon: 'error',
            mask: true
          });
          reject(`ERROR${errno}: ${errMsg}`);
        }
      });
    });
  },

  async initTIM() {
    if (this.globalData.TUIEnabled) {
      console.error('私信重复登录！');
      return { errno: -1 };
    }
    this.globalData.config.userID = this.globalData.openId;
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

    const user_id = 'USER' + id;

    this.globalData.TUISDKReady = false;
    this.globalData.config.userID = user_id;

    console.log("生成用户聊天ID");
    var result = await api.genUserSig(user_id);
    console.log('result', result);
    if (result.errno == -1) {
      console.log("生成用户聊天ID失败！");
      return new RespError("生成用户聊天ID失败！");
    }
    const userSig = result.data.userSig;
    console.log("用户SIG：", userSig);

    wx.$chat_SDKAppID = this.globalData.config.SDKAPPID;
    wx.$chat_userID = user_id;
    wx.$chat_userSig = userSig;
    wx.$TUIKit.login({
      userID: user_id,
      userSig
    });

    return new Promise((ok) => {
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, ok, this);
    });
  },

  async onSDKReady(event) {
    // 监听到此事件后可调用 SDK 发送消息等 API，使用 SDK 的各项功能。
    console.log("TencentCloudChat SDK_READY");
    this.globalData.TUISDKReady = true;
    this.globalData.totalUnread = await wx.$TUIKit.getTotalUnreadMessageCount();
    this.globalData.onUnreadCountUpdate(this.globalData.totalUnread);
  },

  onTotalUnreadMessageCountUpdated(event) {
    console.log("TencentCloudChat TOTAL_UNREAD_MESSAGE_COUNT_UPDATED");
    this.globalData.totalUnread = event.data;
    this.globalData.onUnreadCountUpdate(this.globalData.totalUnread);
  },

  timeString(){
    const date = new Date();
    const hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    const secs = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return `${hours}:${minutes}:${secs}`;
  },

  async onMessageReceived(event) {
    console.log(`onMessageReceived: ${event.data}`);
    const { conversationID } = event.data;
    const messageList = await wx.$TUIKit.getMessageList({ conversationID });
    if (messageList.length <= 1){
      const msg = messageList[0];
      const { from, payload } = msg;
      const text = payload.hasOwnProperty("text") ? payload.text : "[消息]";
      const user_profile = await wx.$TUIKit.getUserProfile({ userIDList: [ from ] });
      const group_profile = await wx.$TUIKit.getGroupProfile({ groupID: conversationID, groupCustomFieldFilter: ['name'] });
      this.sendIMSubscribeMessage({
        name: user_profile[0].nick,
        message: text,
        time: this.timeString(),
        commodity: group_profile.name
      });
    }
  },

  // 发送订阅消息
  pushToUser(options) {
    console.log('pushToUser options ->', options);
    const { access_token, touser, template_id, data } = options;
    IMAxios({
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

  async fetchOpenId() {
    let openId = wx.getStorageSync('openId');
    if (!openId) {
      const { data: { openId } } = await api.getOpenId();
      wx.setStorageSync('openId', openId);
    }
    this.globalData.openId = openId;
  },

  async fetchSelfInfo() {
    let self = wx.getStorageSync('self');
    if (!self) {
      const res = await api.getSelfInfo();
      self = res.data;
      wx.setStorageSync('self', self);
    }
    const registered = Boolean(self?._id);
    this.globalData.registered = registered;
    if (registered) {
      this.globalData.self = self;
      this.userChangedSubject.next(self);
    }
  },

  async fetchRegions() {
    let regions = wx.getStorageSync('regions');
    if (!regions) {
      regions = (await api.getRegions()).data ?? [];
      wx.setStorageSync('regions', regions);
    }
    const ridToRegion = {};
    for (const region of regions) {
      ridToRegion[region._id] = region;
    }
    this.globalData.regions = regions;
    this.globalData.ridToRegion = ridToRegion;
  },

  async fetchCategories() {
    let categories = wx.getStorageSync('categories');
    if (!categories) {
      const resp = await api.getCategory();
      categories = resp.data ?? [];
      wx.setStorageSync('categories', categories);
    }
    this.globalData.categories = categories;
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
