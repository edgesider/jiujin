import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import api from '../../api/api';

type Input = WechatMiniprogram.Input;
const app = getApp()

Page({
  data: {
    ...getConstants(),
    email: '',
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
  },
  onEmailInput(ev: Input) {
    const { detail: { value } } = ev;
    this.setData({ email: value });
  },
  async onConfirmVerify() {
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
})