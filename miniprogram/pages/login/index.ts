import getConstants from '../../constants';
import api from '../../api/api';

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
    console.log(resp.data);
  },
})