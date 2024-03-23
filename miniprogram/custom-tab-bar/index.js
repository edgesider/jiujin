// custom-tab-bar/index.js
import getConstants from '../constants';
import { ensureRegistered } from '../utils/other';

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
        iconPath: '/images/home0.png',
        selectedIconPath: '/images/home1.png',
        text: '首页'
      },
      {
        pagePath: '/pages/commodity_publish/index',
        iconClass: 'cuIcon-question',
        toastText: '敬请期待！',
        text: '互助',
        iconPath: '/images/book0.png',
        selectedIconPath: '/images/book1.png'
      },
      {
        pagePath: '/pages/commodity_publish/index',
        iconClass: 'cuIcon-add',
        useNavigateTo: true, // 是否使用navigateTo打开新的页面
        text: '发布',
        iconPath: '/images/add0.png',
        selectedIconPath: '/images/add1.png'
      },
      {
        pagePath: '/pages/chat/chat_list/index',
        iconClass: 'cuIcon-message',
        selectedIconClass: 'cuIcon-messagefill',
        text: '私信',
        requireRegistered: true,
        iconPath: '/images/chat0.png',
        selectedIconPath: '/images/chat1.png'
      },
      {
        pagePath: '/pages/me/index',
        iconClass: 'cuIcon-my',
        selectedIconClass: 'cuIcon-myfill',
        text: '我的',
        iconPath: '/images/my0.png',
        selectedIconPath: '/images/my1.png'
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
        console.log('未读消息数改变为', count);
        this.setData({
          unreadCount: count
        });
      }
    },
  },
  methods: {
    async switchTab(e) {
      const { pagePath, useNavigateTo, toastText, requireRegistered } = e.currentTarget.dataset.data;
      if (toastText) {
        await wx.showToast({
          title: toastText,
          icon: 'none'
        })
        return;
      }
      if (requireRegistered) {
        ensureRegistered();
      }
      if (useNavigateTo) {
        await wx.navigateTo({ url: pagePath })
      } else {
        await wx.switchTab({ url: pagePath })
      }
    },
  },
})
