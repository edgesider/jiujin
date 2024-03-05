import getConstants from "../constants";

Component({
  data: {
    ...getConstants(),
    selected: 0,
    color: '#7A7E83',
    selectedColor: '#3cc51f',
    list: [
      {
        pagePath: '/pages/home/index',
        iconClass: 'cuIcon-home',
        selectedIconClass: 'cuIcon-homefill',
        text: '首页'
      },
      {
        pagePath: '/pages/commodity_publish/index',
        iconClass: 'cuIcon-question',
        toastText: '敬请期待！',
        text: '互助',
      },
      {
        pagePath: '/pages/commodity_publish/index',
        iconClass: 'cuIcon-add',
        useNavigateTo: true, // 是否使用navigateTo打开新的页面
        text: '发布',
      },
      {
        pagePath: "/TUIService/pages/tim_index/tim_index",
        iconClass: "cuIcon-message",
        selectedIconClass: "cuIcon-messagefill",
        text: "私信"
      },
      {
        pagePath: '/pages/me/index',
        iconClass: 'cuIcon-my',
        selectedIconClass: 'cuIcon-myfill',
        text: '我的'
      },
    ],
    url: '',
    unreadCount: 0,
  },
  lifetimes: {
    created() {
      this.updateTo = url => {
        const i = this.data.list.findIndex(item => item.pagePath === '/' + url);
        this.setData({ selected: i, url })
      }
      getApp().globalData.onUnreadCountUpdate = (count) => {
        console.log("未读消息数改变为", count);
        this.setData({
          unreadCount: count
        });
      }
    },
  },
  methods: {
    async switchTab(e) {
      const data = e.currentTarget.dataset
      const { path, useNavigateTo, toastText } = data;
      if (toastText) {
        await wx.showToast({
          title: toastText,
          icon: 'none'
        })
        return;
      }
      if (useNavigateTo) {
        await wx.navigateTo({ url: path })
      } else {
        await wx.switchTab({ url: path })
      }
    },
  },
})