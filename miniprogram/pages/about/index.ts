import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { waitForAppReady } from '../../utils/globals';
import { openWebView } from '../../utils/router';
import { toastSucceed } from '../../utils/other';

const app = getApp()

export type AboutType = 'contract_us' | 'about_us';

Page({
  data: {
    ...getConstants(),
    type: null as AboutType | null,
    email: 'huqiang@lllw.cc',
    wechat: 'buaaxiaoqiang'
  },
  _subscription: null as Subscription | null,
  async onLoad(options) {
    await waitForAppReady();
    this._subscription = new Subscription();

    const { type } = options;
    if (['contract_us', 'about_us'].indexOf(type ?? '') === -1) {
      throw Error(`unknown type ${type}`);
    }
    this.setData({ type: type as AboutType });
  },
  async onCopyEmail() {
    await wx.setClipboardData({ data: this.data.email, });
    toastSucceed('邮箱已复制');
  },
  async onCopyWeChat() {
    await wx.setClipboardData({ data: this.data.wechat, });
    toastSucceed('微信号已复制');
  },
  onClickPrivacyPolicy() {
    openWebView('https://baidu.com?q=123');
  },
  onClickServiceProtocol() {
    openWebView('https://baidu.com?q=456');
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  }
})