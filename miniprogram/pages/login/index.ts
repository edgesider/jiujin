import getConstants, { DEFAULT_REGION_ID, GENDER } from '../../constants';
import api, { getOpenId } from '../../api/api';
import randomName from '../../utils/randomName';
import { sleep } from '../../utils/other';
import Identicon from '../../utils/randomAvatar';
import { getLastEnterByShareInfo } from '../../utils/share';

type CustomEvent = WechatMiniprogram.CustomEvent;

const app = getApp()

Page({
  data: {
    ...getConstants(),
    agreed: false,
  },

  async onLoad(options) {},

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

  onClickProtocol() {
    console.log('click protocol');
    wx.showToast({
      title: 'click protocol'
    });
  },

  async onGetPhone(ev: CustomEvent) {
    const { code, errno, errMsg } = ev.detail;
    if (errno || !code) {
      console.error(`getPhoneNumber failed, errno=${errno}, errMsg=${errMsg}`);
      return;
    }
    const resp = await api.getPhoneNumber(code)
    if (resp.isError) {
      console.error('getPhoneNumber failed', resp);
      return;
    }
    const phone = resp.data;
    console.log('got phone number', phone);
    await this.register(phone);
  },

  async register(phone: string) {
    await wx.showLoading({ title: '注册中', });

    const shareInfo = getLastEnterByShareInfo();
    console.log('lastShareInfo', shareInfo);
    const params = {
      avatar_url: await this.generateAvatar(),
      name: randomName.getNickName(),
      sex: GENDER.MALE,
      rid: DEFAULT_REGION_ID,
      phone_number: phone,
      inviter_id: shareInfo?.fromUid,
    };

    const resp = await api.registerUser(params);
    if (resp.isError) {
      await wx.hideLoading()
      await wx.showToast({
        title: '注册失败\n' + JSON.stringify(resp),
        icon: 'error',
      })
      console.error(resp);
      return;
    }
    await app.fetchSelfInfo();
    await Promise.all([app.initTIM(), app.fetchRegions()]);
    await wx.hideLoading();
    await wx.showToast({
      title: '注册成功',
      icon: 'success',
    });
    await sleep(1500);
    await wx.reLaunch({
      url: '/pages/me/index',
    });
  },

  async generateAvatar() {
    const avatar = (new Identicon(getOpenId())).toString() + Date.now().toString();
    return new Promise<string>((resolve, rej) => {
      const fs = wx.getFileSystemManager();
      fs.writeFile({
        filePath: `${wx.env.USER_DATA_PATH}/generated_avatar_tmp.png`,
        data: avatar,
        encoding: 'base64',
        success: async (res) => {
          if (!res.errMsg.includes('ok')) {
            rej(`failed to write generated avatar ${res.errMsg}`);
            return;
          }
          const resp = await api.uploadImage(
            `${wx.env.USER_DATA_PATH}/generated_avatar_tmp.png`,
            `avatar/${getOpenId()}_${Date.now()}_${Math.random() * 10000000}`
          );
          if (resp.isError) {
            rej(`failed to upload image: ${resp.message}`);
            return;
          }
          resolve(resp.data);
        }
      })
    })
  },
})