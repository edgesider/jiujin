import api, { getOpenId } from "../../api/api";
import rules from "../../utils/rules";
import getConstants, { GENDER } from "../../constants";
import { getL1Regions, getRegionPath, getRegionsByParent, sleep } from "../../utils/other";

const app = getApp();

/**
 * 注册或编辑个人资料
 */
Page({
  data: {
    ...getConstants(),

    name: "",
    avatarUrl: "",
    gender: GENDER.MALE,
    genderOptions: ['男', '女'],

    availableRegions: [[], [], [], []],
    regionIndexes: [0, 0, 0, 0],
    l1Text: '',
    l2l3l4Text: '',
  },

  async onLoad(options) {
    const { ridToRegion, self } = app.globalData;
    const [l4, l3, l2, l1] = getRegionPath(self.rid);
    const availableRegions = [
      getL1Regions(ridToRegion), // l1 list
      getRegionsByParent(l1._id), // l2 list
      getRegionsByParent(l2._id), // l3 list
      getRegionsByParent(l3._id), // l4 list
    ];
    const regionIndexes = [
      availableRegions[0].indexOf(l1),
      availableRegions[1].indexOf(l2),
      availableRegions[2].indexOf(l3),
      availableRegions[3].indexOf(l4),
    ];
    this.setData({
      avatarUrl: self.avatar_url,
      name: self.name,
      gender: self.sex,
      availableRegions,
      regionIndexes,
      ...this.getRegionTexts(availableRegions, regionIndexes),
    });
  },

  // 导航栏
  onNavigateBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  onChangeName(event) {
    this.setData({
      name: event.detail.value
    })
  },

  onChooseAvatar(ev) {
    const { detail: { avatarUrl } } = ev;
    this.setData({
      avatarUrl
    });
  },
  onGenderPickerConfirm(ev) {
    const { detail: { value } } = ev;
    this.setData({ gender: parseInt(value), });
  },

  onRegionChange(ev) {
    const { column, value } = ev.detail;
    const level = column + 2; // 第0列对应的是level2
    this.updateRegionIndex(level, value);
  },
  updateRegionIndex(level, index, isConfirm) {
    const { availableRegions, regionIndexes } = this.data;
    regionIndexes[level - 1] = index;
    for (let i = level; i < regionIndexes.length; i++) {
      availableRegions[i] = getRegionsByParent(availableRegions[i - 1][regionIndexes[i - 1]]._id);
      regionIndexes[i] = 0;
    }
    this.setData({
      availableRegions,
      regionIndexes,
      ...(isConfirm ? this.getRegionTexts(availableRegions, regionIndexes) : {})
    });
  },
  onRegionConfirm(ev) {
    const { detail: { value } } = ev;
    const { regionIndexes, availableRegions } = this.data;
    if (typeof value === 'string') {
      // 返回单个字符串，说明改的是l1
      const newL1 = parseInt(value);
      if (isNaN(newL1)) {
        return;
      }
      this.updateRegionIndex(1, newL1, true);
    } else if (Array.isArray(value)) {
      // 返回数组，说明改的是l2/l3/l4
      const newIndexes = [regionIndexes[0], ...value]
      this.setData({
        regionIndexes: newIndexes,
        ...this.getRegionTexts(availableRegions, newIndexes),
      });
    }
  },
  getRegionTexts(availableRegions, regionIndexes) {
    return {
      l1Text: availableRegions[0][regionIndexes[0]].name,
      l2l3l4Text: [
        availableRegions[1][regionIndexes[1]].name,
        availableRegions[2][regionIndexes[2]].name,
        availableRegions[3][regionIndexes[3]].name,
      ].join('/'),
    };
  },

  /** 获取当前选择的l4 */
  getSelectedRegion() {
    const { availableRegions, regionIndexes } = this.data;
    return availableRegions[3][regionIndexes[3]];
  },

  async onClickGender() {
    const { tapIndex } = await wx.showActionSheet({
      itemList: ['男', '女']
    });
    if (tapIndex === 0) {
      this.setData({
        gender: GENDER.MALE
      });
    } else if (tapIndex === 1) {
      this.setData({
        gender: GENDER.FEMALE
      });
    }
  },

  // 提交注册信息
  async onRegister() {
    const { name, gender: sex } = this.data;
    let avatar_url = this.data.avatarUrl;
    const rid = this.getSelectedRegion()._id;
    if (avatar_url && !/^(cloud|http|https):\/\//.test(avatar_url) || /http:\/\/tmp\//.test(avatar_url)) {
      const resp = await api.uploadImage(
        avatar_url,
        `avatar/${getOpenId()}_${Date.now()}_${Math.random() * 10000000}`
      );
      console.log('uploaded', resp.data);
      if (resp.isError) {
        await wx.hideLoading();
        await wx.showToast(({
          title: '头像上传失败',
          icon: 'error',
        }));
        return;
      }
      avatar_url = resp.data;
    }

    const params = {
      avatar_url,
      name,
      sex,
      rid
    };
    if (!rules.required(params.name)) {
      await wx.showToast({
        title: "昵称不能为空！",
        icon: 'error',
      })
      return
    }

    await wx.showLoading({ title: '正在提交中', });

    const resp = await api.updateUser(params);
    if (resp.isError) {
      await wx.hideLoading()
      let msg = '保存失败\n' + JSON.stringify(resp);
      if (resp.errno === -2) {
        msg = '位置修改得太频繁啦！';
      }
      await wx.showToast({
        title: msg,
        icon: 'error',
      })
      return;
    }
    await app.fetchSelfInfo();
    await Promise.all([app.fetchRegions()]);
    await wx.hideLoading();
    await wx.showToast({
      title: '已保存',
      icon: 'success',
    });
    await sleep(1500);
    await wx.navigateBack()
  }
})
