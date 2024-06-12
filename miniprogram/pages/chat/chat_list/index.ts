import getConstants from '../../../constants';
import { setTabBar, sleep } from '../../../utils/other';
import { User } from '../../../types';
import { Subscription } from 'rxjs';
import { getNotifySwitches, NotifyType } from '../../../utils/notify';
import {
  getAllConversationList,
  getConversationList, isOimLogged, isOthersNewCreateConversation,
  isTransactionGroup, listenConversations, listenNewConvList, waitForOimLogged,
} from '../../../utils/oim';
import { ConversationItem } from '../../../lib/openim/index';
import { getOpenId } from '../../../api/api';

const app = getApp();

Page({
  data: {
    ...getConstants(),
    conversations: [] as ConversationItem[],
    systemConv: null as ConversationItem | null,
    refreshing: false,
    self: null as User | null,
    showNotifyTip: false,
    scrollToTop: false,

    updateIndex: 0,
  },
  subscription: null as Subscription | null,
  async onLoad() {
    setTabBar(this, () => {
      this.scrollToTop();
    });
    this.setData({ self: app.globalData.self });

    if (!isOimLogged()) {
      await wx.showLoading({ title: '加载中' });
      try {
        await waitForOimLogged();
      } catch (e) {
        await wx.showToast({
          title: '私信登录失败',
          icon: 'error',
        });
      }
      await wx.hideLoading();
    }

    this.subscription = new Subscription();
    this.subscription.add(listenNewConvList().subscribe(list => {
      this.onConversationListUpdate([...list, ...this.data.conversations]);
    }));
    this.subscription.add(listenConversations().subscribe(updated => {
      const { conversations } = this.data;
      for (const updatedConv of updated) {
        const idx = conversations.findIndex(c => c.conversationID === updatedConv.conversationID);
        if (idx >= 0) {
          // @ts-ignore
          updatedConv.__others_new_create = isOthersNewCreateConversation(updatedConv);
          conversations[idx] = updatedConv;
        }
      }
      this.setData({
        conversations: conversations.sort(this.sorter),
      });
    }));

    await this.doRefresh();
  },
  updateNotifyTip() {
    const switches = getNotifySwitches();
    if (!switches.mainSwitch
      || switches[NotifyType.CommodityChat] === 'reject'
      || switches[NotifyType.HelpChat] === 'reject'
    ) {
      this.setData({ showNotifyTip: true, });
    } else {
      this.setData({ showNotifyTip: false });
    }
  },
  onUnload() {
    this.subscription?.unsubscribe();
  },
  async onShow() {
    await sleep(500);
    this.updateNotifyTip();
  },
  sorter: (a: ConversationItem, b: ConversationItem) => b.latestMsgSendTime - a.latestMsgSendTime,
  async onConversationListUpdate(convList: ConversationItem[]) {
    const list: ConversationItem[] = [];
    let systemConv: ConversationItem | null = null;
    for (const conv of convList) {
      if (!conv.groupID) {
        continue;
      }
      if (isTransactionGroup(conv.groupID)) {
        // @ts-ignore
        conv.__others_new_create = isOthersNewCreateConversation(conv);
        list.push(conv);
      } else if (conv.groupID === `${getOpenId()}_system`) {
        systemConv = conv;
      }
    }
    list.sort(this.sorter);
    this.setData({
      conversations: list,
      systemConv,
      updateIndex: this.data.updateIndex + 1, // 触发已有子组件的更新
    });

    const { self } = this.data;
    if (self) {
      for (const conv of convList) {
        if (conv.groupID.startsWith(self._id)) {
          if (conv.isPinned) {
            continue;
          }
          await oim.pinConversation({
            conversationID: conv.conversationID,
            isPinned: true
          });
        }
      }
    }
  },
  scrollToTop() {
    this.setData({ scrollToTop: false, }, () => {
      this.setData({ scrollToTop: true, });
    });
  },
  async doRefresh() {
    await this.onConversationListUpdate(await getConversationList(0, 20));
  },
  async onRefresh() {
    if (this.data.refreshing) {
      return;
    }
    this.setData({ refreshing: true });
    try {
      await this.doRefresh();
    } catch (e) {
      console.error(e);
      await wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    } finally {
      await sleep(500);
      this.setData({ refreshing: false });
    }
  },
  async onReachBottom() {
    const oldList = await getConversationList(this.data.conversations.length, 20);
    await this.onConversationListUpdate([...this.data.conversations, ...oldList]);
  },
  gotoNotifySetting() {
    wx.openSetting();
  },
})