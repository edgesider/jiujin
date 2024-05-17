import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import api from '../../api/api';
import { getGlobals } from '../../utils/globals';

type Input = WechatMiniprogram.Input;
const app = getApp()

Page({
  data: {
    ...getConstants(),
    email: '',
    verified: false,
  },
  _subscription: null as Subscription | null,
  async onLoad() {
    this._subscription = new Subscription();
    const self = getGlobals().self;
    if (!self) {
      await wx.showToast({
        icon: 'error',
        title: '未登录'
      });
      await wx.navigateBack();
      return;
    }
    this.setData({
      verified: self.verify_status ?? false
    });
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  },
  onEmailInput(ev: Input) {
    const { detail: { value } } = ev;
    this.setData({ email: value });
  },
  async onConfirmVerify() {
    if (this.data.verified) {
      return;
    }
    const { email } = this.data;
    if (!/^\S+@buaa\.edu\.cn$/.test(email)) {
      await wx.showToast({
        title: '无效的邮箱',
        icon: 'error'
      });
      return;
    }
    const resp = await api.verifyByEmail(email);
    if (resp.isError) {
      await wx.showToast({
        title: `发起认证失败 ${resp.message}`
      })
      return;
    }
    await wx.showToast({
      title: '认证邮件已发至您的邮箱'
    })
  },
  async onGPSVerify() {
    if (this.data.verified) {
      return;
    }
    const loc = await wx.getLocation({
      type: 'wgs84',
    });
    const lngLat = [loc.longitude, loc.latitude];
    console.log(lngLat)
  }
})