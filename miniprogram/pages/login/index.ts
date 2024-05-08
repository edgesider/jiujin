import getConstants, { DEFAULT_REGION_ID, GENDER } from '../../constants';
import api, { getOpenId } from '../../api/api';
import randomName from '../../utils/randomName';
import { sleep } from '../../utils/other';
import Identicon from '../../utils/randomAvatar';
import { getLastEnterByShareInfo } from '../../utils/share';
import { decode } from 'base64-arraybuffer';

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
    await wx.showLoading({ title: '注册中', });
    let error: string = '';
    try {
      const resp = await api.getPhoneNumber(code)
      if (resp.isError) {
        console.error('getPhoneNumber failed', resp);
        error = '获取手机号码失败';
      }
      await this.register(resp.data);
    } catch (e: any) {
      error = e?.message ?? '注册失败';
    } finally {
      await wx.hideLoading()
    }
    if (error) {
      await wx.showToast({
        title: error,
        icon: 'error',
      });
    }
  },

  async register(phone: string) {
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
    });
    await sleep(1500);
    await wx.reLaunch({
      url: '/pages/me/index',
    });
  },

  async generateAvatar() {
    return new Promise<string>((resolve, rej) => {
      const avatarB64 = (new Identicon(Date.now().toString() + Date.now().toString())).toString();
      const avatar = decode(avatarB64);
      const fs = wx.getFileSystemManager();
      fs.writeFile({
        filePath: `${wx.env.USER_DATA_PATH}/generated_avatar_tmp.png`,
        data: avatar,
        encoding: 'binary',
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
        },
        fail(res) {
          rej(res);
        }
      })
    })
  },
})