import api, { getOpenId } from "../../api/api";
import rules from "../../utils/rules";
import getConstants, { DEFAULT_AVATAR, GENDER } from "../../constants";
import { sleep } from "../../utils/other";
import randomName from "../../utils/randomName";

const app = getApp();

/**
 * 注册或编辑个人资料
 */
Page({
  data: {
    ...getConstants(),
    isEdit: false,

    name: "",
    avatarUrl: "",
    gender: GENDER.MALE,
    genderOptions: ['男', '女'],

    regions: [],
    l1ToL4: {},
    indexes: [0, 0],
    l1L4Pair: [[], []],
  },

  async onLoad(options) {
    const { regions, ridToRegion, self } = app.globalData;
    const isEdit = Boolean(self);
    // 大学
    const l1Regions = [];
    // 大学 -> 楼号
    const l1ToL4 = {};

    for (const region of regions) {
      if (region.level === 1) {
        l1Regions.push(region);
      }
    }
    // 从树根开始，找到所有的叶子节点（L4）
    const tillL4 = (rid) => {
      const region = ridToRegion[rid];
      if (!region) {
        return [];
      }
      if (region.level === 4) {
        return [region._id];
      } else {
        const list = [];
        for (const child of region.children) {
          list.push(...tillL4(child));
        }
        return list;
      }
    }
    for (const l1 of l1Regions) {
      if (l1.level !== 1) {
        continue;
      }
      l1ToL4[l1._id] = tillL4(l1._id).map(rid => ridToRegion[rid]);
    }

    if (isEdit) {
      const self = app.globalData.self;
      let [idxL1, idxL4] = [0, 0];
      const l1 = Object.entries(l1ToL4).find(([l1, l4s]) => l4s.findIndex(l4 => l4._id === self.rid) >= 0)[0];
      if (l1) {
        idxL1 = l1Regions.findIndex(l => l._id === parseInt(l1));
        idxL4 = l1ToL4[l1].findIndex(l => l._id === self.rid);
      }
      this.setData({
        l1ToL4,
        l1L4Pair: [l1Regions, l1ToL4[l1Regions[0]._id]],
        indexes: [idxL1, idxL4],
        isEdit: true,
        avatarUrl: self.avatar_url,
        name: self.name,
        gender: self.sex,
      });
    } else {
      this.setData({
        l1ToL4,
        l1L4Pair: [l1Regions, l1ToL4[l1Regions[0]._id]],
        indexes: [0, 0],
        name: randomName.getNickName(),
        avatarUrl: DEFAULT_AVATAR,
      });
    }
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

  onRegionPickerConfirm(event) {
    const { detail: { value } } = event;
    console.log(value, typeof value[0]);
    this.setData({ indexes: value });
  },
  onRegionPickerChange(event) {
    const columnIndex = event.detail.column; // 被更新的列
    const index = event.detail.value; // 更新的值

    const { indexes, l1ToL4, l1L4Pair } = this.data;
    // 先更新索引
    indexes[columnIndex] = index;

    // 根据索引更新数据（l1L4Pair）
    const l1 = l1L4Pair[0][indexes[0]]; // 获取新的l1
    const l4List = l1ToL4[l1._id]; // 获取新的l4
    this.setData({
      l1L4Pair: [l1L4Pair[0], l4List]
    })
  },

  getSelectedRegion() {
    const { l1L4Pair, indexes } = this.data;
    return l1L4Pair[1][indexes[1]];
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
    const { isEdit, name, gender: sex } = this.data;
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

    const resp = isEdit ? await api.updateUser(params) : await api.registerUser(params);
    if (resp.isError) {
      await wx.hideLoading()
      let msg = (isEdit ? '保存' : '注册') + '失败\n' + JSON.stringify(resp);
      if (isEdit && resp.errno === -2) {
        msg = '位置修改得太频繁啦！';
      }
      await wx.showToast({
        title: msg,
        icon: 'error',
      })
      return;
    }
    await app.fetchSelfInfo();
    await Promise.all([app.initTIM(), app.fetchRegions()]);
    await wx.hideLoading();
    await wx.showToast({
      title: (isEdit ? '已保存' : '注册成功'),
      icon: 'success',
    });
    await sleep(1500);
    await wx.navigateBack()
  }
})