import getConstants from '../../../constants';
import { setTabBar, sleep, toastLoading, toastLoadingHide } from '../../../utils/other';
import { User } from '../../../types';
import { Subscription } from 'rxjs';
import {
  deleteConversation,
  getConversationList, isOimLogged, isOthersNewCreateConversation,
  isTransactionGroup, listenConversations, listenNewConvList, waitForOimLogged,
} from '../../../utils/oim';
import { ConversationItem } from '../../../lib/openim/index';
import { getOpenId } from '../../../api/api';

type TouchEvent = WechatMiniprogram.TouchEvent;

const app = getApp();

Page({
  data: {
    ...getConstants(),
    conversations: [] as ConversationItem[],
    systemConv: null as ConversationItem | null,
    refreshing: false,
    self: null as User | null,
    scrollToTop: false,
    loading: false,

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
          this.patchConv(updatedConv);
          conversations[idx] = updatedConv;
        }
      }
      this.setData({
        conversations: conversations,
      });
    }));

    await this.doRefresh();
  },
  onUnload() {
    this.subscription?.unsubscribe();
  },
  // sorter: (a: ConversationItem, b: ConversationItem) => b.latestMsgSendTime - a.latestMsgSendTime,
  patchConv(conv: ConversationItem) {
    let canShow = true;
    if (!conv.groupID) {
      canShow = false;
    }
    if (isTransactionGroup(conv.groupID)) {
      if (isOthersNewCreateConversation(conv)) {
        // 新建的群
        canShow = false;
      }
    } else if (conv.groupID.startsWith(getOpenId())) {
      // 系统通知群
      canShow = false;
    }
    // @ts-ignore
    conv.__can_show = canShow;
  },
  async onConversationListUpdate(convList: ConversationItem[]) {
    const list: ConversationItem[] = [];
    let systemConv = this.data.systemConv;
    for (const conv of convList) {
      this.patchConv(conv);
      if (conv.groupID === `${getOpenId()}_system`) {
        systemConv = conv;
      }
      list.push(conv);
    }
    this.setData({
      conversations: list,
      systemConv,
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
    this.setData({ loading: true });
    try {
      const oldList = await getConversationList(this.data.conversations.length, 20);
      await this.onConversationListUpdate([...this.data.conversations, ...oldList]);
    } finally {
      this.setData({ loading: false });
    }
  },
  gotoNotifySetting() {
    wx.openSetting();
  },
  async onDeleteConv(ev: TouchEvent) {
    const { idx } = ev.currentTarget.dataset;
    const conv = this.data.conversations[idx];
    if (!conv) {
      return;
    }
    const { confirm } = await wx.showModal({ title: '确认删除此会话？' });
    if (!confirm) {
      return;
    }
    toastLoading('删除中');
    try {
      await deleteConversation(conv);
      const list = this.data.conversations;
      list.splice(idx, 1);
      this.setData({ conversations: list });
    } finally {
      toastLoadingHide();
    }
  },
})