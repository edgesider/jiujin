import getConstants from '../constants';
import { ensureRegistered } from '../utils/other';
import {
  getConversationList,
  isOthersNewCreateConversation,
  listenUnreadCount,
  markConvMessageAsRead,
  waitForOimReady
} from "../utils/oim";
import { waitForAppReady } from "../utils/globals";

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
        text: '首页',
        iconPath: '/images/home0.png',
        selectedIconPath: '/images/home1.png',
        hasDot: false,
      },
      {
        pagePath: '/pages/help/index',
        iconClass: 'cuIcon-question',
        selectedIconClass: 'cuIcon-questionfill',
        text: '互助',
        iconPath: '/images/book0.png',
        selectedIconPath: '/images/book1.png',
        hasDot: false,
      },
      {
        pagePath: '/pages/publish/index',
        iconClass: 'cuIcon-add',
        selectedIconClass: 'cuIcon-addfill',
        text: '发布',
        requireRegistered: true,
        iconPath: '/images/add0.png',
        selectedIconPath: '/images/add1.png',
        hasDot: false,
      },
      {
        pagePath: '/pages/chat/chat_list/index',
        iconClass: 'cuIcon-message',
        selectedIconClass: 'cuIcon-messagefill',
        text: '私信',
        requireRegistered: true,
        iconPath: '/images/chat0.png',
        selectedIconPath: '/images/chat1.png',
        hasDot: false,
      },
      {
        pagePath: '/pages/me/index',
        iconClass: 'cuIcon-my',
        selectedIconClass: 'cuIcon-myfill',
        text: '我的',
        iconPath: '/images/my0.png',
        selectedIconPath: '/images/my1.png',
        hasDot: false,
      },
    ],
  },
  lifetimes: {
    async created() {
      const tab = this;
      this.updateTo = function (url, onClick) {
        const i = this.data.list.findIndex(item => item.pagePath === '/' + url);
        tab.onClick = onClick;
        this.setData({ selected: i, url })
      }

      await waitForAppReady();
      await waitForOimReady();
      const unreadChanged = async () => {
        const convList = await getConversationList();
        const count = convList
          .filter(c => !isOthersNewCreateConversation(c))
          .map(c => c.unreadCount)
          .reduce((count, curr) => count + curr);
        this.data.list.find(item => item.text === '私信').hasDot = count > 0;
        this.setData({
          list: [...this.data.list],
        });
        convList.filter(isOthersNewCreateConversation).forEach(markConvMessageAsRead);
      }
      listenUnreadCount().subscribe(unreadChanged);
    },
  },
  methods: {
    async switchTab(e) {
      const { pagePath, useNavigateTo, toastText, requireRegistered } = e.currentTarget.dataset.data;
      const index = e.currentTarget.dataset.index;
      if (this.data.selected === index) {
        this.onClick?.();
      }
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
