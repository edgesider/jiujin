import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import api from '../../api/api';
import { getGlobals } from '../../utils/globals';
import { VerifyAPI, VerifyStatus } from '../../api/verify';
import { User } from '../../types';
import { sleep, toastError, toastSucceed } from '../../utils/other';

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
    const resp = await api.getSelfInfo();
    if (!resp || !resp.data) {
      toastError('网络错误', true);
      await sleep(3000);
      await wx.navigateBack()
      return;
    }
    const self = resp.data;
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
      toastError('无效的邮箱');
      return;
    }
    const resp = await VerifyAPI.verifyByEmail(inputEmail);
    if (resp.isError) {
      toastError(`发起认证失败 ${resp.message}`, true);
      return;
    }
    toastSucceed('认证邮件已发至您的邮箱', true);
    await sleep(3000);
  },
  async onConfirmGPSVerify() {
    if (this.data.verified) {
      return;
    }
    await wx.showLoading({ mask: true, title: '定位中' });
    const { longitude, latitude } = await wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
    });
    console.log(`lng=${longitude}, lat=${latitude}`);
    await wx.showLoading({ mask: true, title: '验证中' });
    const resp = await VerifyAPI.verifyByGPS(longitude, latitude);
    await wx.hideLoading();
    if (resp.isError) {
      toastError('位置验证未通过');
    } else {
      toastSucceed('位置验证成功', true);
      await sleep(3000);
      await wx.navigateBack();
    }
  },

  uploading: false,
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
      toastError('请选择校园卡图片');
      return;
    }
    this.uploading = true;
    try {
      await wx.showLoading({ title: '请稍后', mask: true });
      const imageResp = await api.uploadImage(imageToUpload, `verify/${self._id}_${Date.now()}`);
      if (imageResp.isError || !imageResp.data) {
        toastError('照片上传失败');
        return;
      }

      const resp = await VerifyAPI.verifyByCardImage(imageResp.data);
      if (resp.isError) {
        toastError('服务器打瞌睡了，请稍后重试');
        return;
      }
    } finally {
      this.uploading = false;
      await wx.hideLoading();
    }
    toastSucceed('正在审核中，请耐心等待');
    await sleep(3000);
    await wx.navigateBack();
  },
})