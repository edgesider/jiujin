import api from './api/api';

App({
  _ready: false,
  _readyWaiters: [],
  globalData: {
    registered: false,
    self: null,
    ridToRegion: null,
    StatusBar: 0,
    CustomBar: 0,
  },

  async onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'jj-4g1ndtns7f1df442',
        // traceUser: true,
      })
    }

    // Color UI: 获得系统信息
    wx.getSystemInfo({
      success: e => {
        this.globalData.StatusBar = e.statusBarHeight;
        let custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    })

    // 清空缓存
    wx.clearStorageSync()
    // TODO 存到storage中
    await Promise.all([this.fetchSelfInfo(), this.fetchRegions()])

    console.log('initialized. globalData=', this.globalData);
    this._ready = true;
    this._readyWaiters.forEach(waiter => waiter());
  },

  async fetchSelfInfo() {
    // 查询用户是否已经注册
    const res = await api.getSelfInfo()
    const registered = !!res.data?._id;
    this.globalData.registered = registered;
    if (registered) {
      this.globalData.self = res.data;
    }
  },

  async fetchRegions() {
    const { data: regions } = await api.getRegions() ?? [];
    const ridToRegion = {};
    for (const region of regions) {
      ridToRegion[region._id] = region;
    }
    this.globalData.ridToRegion = ridToRegion;
  },

  async waitForReady() {
    return new Promise(resolve => {
      if (this._ready) {
        resolve();
      } else {
        this._readyWaiters.push(resolve);
      }
    });
  }
})
