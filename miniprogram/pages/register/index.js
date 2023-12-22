import Dialog from '@vant/weapp/dialog/dialog';
import api from "../../api/api";
import rules from "../../utils/rules";

const app = getApp()

Page({
  data: {
    name: "",
    avatarUrl: "",
    contactInfoQQ: "",
    contactInfoWX: "",
    regions: [],
    l1ToL4: {},
    indexes: [0, 0],
    l1L4Pair: [[], []],

    objectMultiArray: [[], []],
    multiIndex: [0, 0]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    wx.showLoading({
      title: '加载中',
    })
    // 获取用户头像，性别等信息
    const userInfo = wx.getStorageSync('userInfo')
    const { avatarUrl, nickName, gender } = userInfo;

    const { data: regions } = await api.getRegions();
    // 大学
    const l1Regions = [];
    // 大学 -> 楼号
    const l1ToL4 = {};

    const ridToRegion = {}
    for (const region of regions) {
      ridToRegion[region._id] = region;
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
    this.setData({
      l1ToL4,
      l1L4Pair: [l1Regions, l1ToL4[l1Regions[0]._id]],
      indexes: [0, 0],
      avatarUrl,
      name: nickName,
      gender,
    });
    wx.hideLoading()
  },

  // 导航栏
  onNavigateBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  // 表单相关
  onChangeName(event) {
    this.setData({
      name: event.detail.value
    })
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
      indexes,
      l1L4Pair: [l1L4Pair[0], l4List]
    })
  },

  getSelectedRegion() {
    const { l1L4Pair, indexes } = this.data;
    return l1L4Pair[1][indexes[1]];
  },

  // 提交注册信息
  async onRegister() {
    const { avatarUrl: avatar_url, name, gender: sex } = this.data;
    const params = {
      avatar_url, name, sex, rid: this.getSelectedRegion()._id
    }
    if (!rules.required(params.name)) {
      Dialog.alert({
        title: '格式错误',
        message: "昵称不能为空！",
      })
      return
    }

    wx.showLoading({
      title: '正在提交中',
    })

    const res = await api.registerUser(params);
    if (res.errno != 0) {
      wx.hideLoading()
      console.log("上传用户信息失败！")
      wx.showToast({
        title: res.message,
        icon: 'none',
        duration: 2000,
        success(res) {
          setTimeout(() => {
          }, 1500)
        }
      })
      return
    }
    console.log("注册成功！")
    wx.hideLoading()

    app.globalData.registered = true
    wx.showToast({
      title: '注册成功！',
      icon: 'success',
      duration: 2000,
      success(res) {
        setTimeout(() => {
          wx.redirectTo({
            url: `../home/index`,
          })
        }, 1500)
      }
    })
  }
})
