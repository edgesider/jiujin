import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import api from '../../api/api';
import { getGlobals } from '../../utils/globals';
import { VerifyAPI, VerifyStatus } from '../../api/verify';
import { User } from '../../types';

type Input = WechatMiniprogram.Input;
const app = getApp()

Page({
  data: {
    ...getConstants(),
    self: null as User | null,
    inputEmail: '',
    imageToUpload: null as string | null,
    verified: VerifyStatus.NotVerified,
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
      self,
      verified: self.verify_status ?? VerifyStatus.NotVerified
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
    this.setData({ inputEmail: value });
  },
  async onConfirmEmailVerify() {
    if (this.data.verified) {
      return;
    }
    const { inputEmail } = this.data;
    if (!/^\S+@buaa\.edu\.cn$/.test(inputEmail)) {
      await wx.showToast({
        title: '无效的邮箱',
        icon: 'error'
      });
      return;
    }
    const resp = await VerifyAPI.verifyByEmail(inputEmail);
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
  async onConfirmGPSVerify() {
    if (this.data.verified) {
      return;
    }
    const { longitude, latitude } = await wx.getLocation({ type: 'wgs84' });
    const resp = await VerifyAPI.verifyByGPS(longitude, latitude);
    // const resp = await VerifyAPI.verifyByGPS(116.347253, 39.992043);
    await wx.showToast({
      icon: resp.isError ? 'error' : 'success',
      title: resp.isError ? '位置验证失败' : '位置验证成功'
    });
  },
  async onUploadCardImage() {
    const { verified, self } = this.data;
    if (verified || !self) {
      return;
    }
    const res = await wx.chooseImage({ count: 1, });
    this.setData({
      imageToUpload: res.tempFilePaths[0],
    });
  },
  async onConfirmImageVerify() {
    const { imageToUpload, self } = this.data;
    if (!self) {
      return;
    }
    if (!imageToUpload) {
      await wx.showToast({
        title: '请选择校园卡图片'
      });
      return;
    }
    const imageResp = await api.uploadImage(imageToUpload, `${self._id}_verify_${Date.now()}`);
    if (imageResp.isError || !imageResp.data) {
      await wx.showToast({
        icon: 'error',
        title: '照片上传失败'
      });
      return;
    }

    const resp = await VerifyAPI.verifyByCardImage(imageResp.data);
    if (resp.isError) {
      await wx.showToast({
        icon: 'error',
        title: '服务器打瞌睡了，请稍后重试'
      });
      return;
    }
    await wx.showToast({
      title: '正在审核中，请耐心等待'
    });
  },
})