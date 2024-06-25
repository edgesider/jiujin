import getConstants, { DEFAULT_REGION_ID, GENDER } from '../../constants';
import api, { getOpenId } from '../../api/api';
import { randomIdName } from '../../utils/randomName';
import { generateRandomAvatarAndUpload, sleep, toastError } from '../../utils/other';
import { getLastEnterByShareInfo } from '../../utils/share';
import { openWebView } from '../../utils/router';
import { initOpenIM } from '../../utils/oim';

type CustomEvent = WechatMiniprogram.CustomEvent;

const app = getApp()

Page({
  data: {
    ...getConstants(),
    agreed: false,
  },

  onToggleAgree() {
    this.setData({
      agreed: !this.data.agreed
    });
  },

  onSubmit() {
    if (!this.data.agreed) {
      return;
    }
    console.log('login')
  },

  onClickServiceProtocol() {
    openWebView('https://static.lllw.cc/service_protocol.html');
  },

  onClickPrivacyPolicy() {
    openWebView('https://static.lllw.cc/privacy_policy.html');
  },

  registering: false,
  async onGetPhone(ev: CustomEvent) {
    const { code, errno, errMsg } = ev.detail;
    if (errno || !code) {
      console.error(`getPhoneNumber failed, errno=${errno}, errMsg=${errMsg}`);
      return;
    }
    if (this.registering) {
      return;
    }
    await wx.showLoading({ title: '注册中', });
    let error: string = '';
    try {
      const resp = await api.getPhoneNumber(code)
      if (resp.isError) {
        console.error('getPhoneNumber failed', resp);
        error = '获取手机号码失败';
      }
      this.registering = true;
      await this.register(resp.data);
    } catch (e: any) {
      error = e?.message ?? '注册失败';
    } finally {
      this.registering = false;
      await wx.hideLoading()
    }
    if (error) {
      toastError(error);
    }
  },

  async register(phone: string) {
    const shareInfo = getLastEnterByShareInfo();
    console.log('lastShareInfo', shareInfo);
    const params = {
      avatar_url: await generateRandomAvatarAndUpload(),
      name: randomIdName(),
      sex: GENDER.MALE,
      rid: DEFAULT_REGION_ID,
      phone_number: phone,
      inviter_id: shareInfo?.fromUid,
    };

    const resp = await api.registerUser(params);
    if (resp.isError) {
      await wx.showToast({
        title: '注册失败\n' + JSON.stringify(resp),
        icon: 'error',
      })
      console.error(resp);
      return;
    }
    await wx.showToast({
      title: '注册成功',
      icon: 'success',
      mask: true,
      duration: 2000
    });
    const self = await app.fetchSelfInfo();
    await app.fetchRegions();
    await initOpenIM(self);
    await sleep(1000);
    await wx.reLaunch({
      url: '/pages/edit_profile/index',
    });
  },
})