const cache = require("./cache/cache")
const api = require("./api/api")

import TencentCloudChat from '@tencentcloud/chat';
import TIMUploadPlugin from 'tim-upload-plugin';
import TIMProfanityFilterPlugin from 'tim-profanity-filter-plugin';
import { genTestUserSig } from './debug/GenerateTestUserSig';

//app.js
App({
  async onLaunch() {
    
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'jj-4g1ndtns7f1df442',
        traceUser: true,
      })
    }

    this.globalData = {
      config: {
        userID: '', // User ID
        SECRETKEY: '0e3f256c7f3e15d4f1d29ea274d8f5e1572a73f4ef2ab9e8d8d7e6c2525f737c', // Your secretKey
        SDKAPPID: 1600012697, // Your SDKAppID
        EXPIRETIME: 604800,
      },
      TUIEnabled: false,
      TUISDKReady: false
    }

    // Color UI: 获得系统信息
    wx.getSystemInfo({
      success: e => {
        this.globalData.StatusBar = e.statusBarHeight;
        let custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.Custom = custom;  
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    })

    // 清空缓存
    wx.clearStorageSync()

    // 查询用户是否已经注册
    const res = await cache.getMyInfoAndMyUniversityInfo()
    if(res.errno == -1){
      this.globalData['registered'] = false
    }else{
      this.globalData['registered'] = true
      this.loginTUI()
    }
  },
  
  async onUnload(){
    if (this.globalData.TUIEnabled){
      wx.$TUIKit.off(wx.TencentCloudChat.EVENT.SDK_READY, this.onSDKReady, this)
      this.globalData.TUIEnabled = false
    }
  },

  async loginTUI(){
    const res = await cache.getMyInfoAndMyUniversityInfo()
    if (this.globalData.TUIEnabled || res.errno == -1)
      return { errno: -1 }
    console.log('私信登录ID: ', res.data.openid)
    this.globalData.config.userID = res.data.openid

    wx.$TUIKit = TencentCloudChat.create({
      SDKAppID: this.globalData.config.SDKAPPID,
    });

    // console.log("生成用户聊天ID")
    // var result = await api.genUserSig(this.globalData.config);
    // console.log('result', result)
    // if (result.errno == -1) {
    //   console.log("生成用户聊天ID失败！")
    //   return new RespError("生成用户聊天ID失败！")
    // }
    // const userSig = result.message;
    
    const userSig = genTestUserSig(this.globalData.config).userSig

    console.log("用户SIG：", userSig);
    
    wx.$chat_SDKAppID = this.globalData.config.SDKAPPID;
    wx.TencentCloudChat = TencentCloudChat;
    wx.$chat_userID = this.globalData.config.userID;
    wx.$chat_userSig = userSig;
    wx.$TUIKit.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin });
    wx.$TUIKit.registerPlugin({ 'tim-profanity-filter-plugin': TIMProfanityFilterPlugin });
    wx.$TUIKit.login({
      userID: this.globalData.config.userID,
      userSig
    });
    // 监听系统级事件
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, this.onSDKReady, this);
    this.globalData.TUIEnabled = true
  },

  globalData: {},

  onSDKReady(event) {
    // 监听到此事件后可调用 SDK 发送消息等 API，使用 SDK 的各项功能。
    console.log("TencentCloudChat SDK_READY");
    this.globalData.TUISDKReady = true
  }
})
