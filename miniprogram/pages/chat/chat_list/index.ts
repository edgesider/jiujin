import getConstants from '../../../constants';
import { setTabBar, sleep } from '../../../utils/other';
import { User } from '../../../types';
import { Subscription } from 'rxjs';
import { NotifyType, requestNotifySubscribe } from '../../../utils/notify';
import {
  getConversationList, isOimLogged, isOthersNewCreateConversation,
  isTransactionGroup, listenConversations, listenNewConvList, waitForOimLogged,
} from '../../../utils/oim';
import { ConversationItem } from '../../../lib/openim/index';

const app = getApp();

Page({
  data: {
    ...getConstants(),
    conversations: [] as ConversationItem[],
    refreshing: false,
    self: null as User | null,
    showNotifyTip: false,

    updateIndex: 0,
  },
  subscription: null as Subscription | null,
  async onLoad() {
    setTabBar(this, () => {
      this.onRefresh();
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
          conversations[idx] = updatedConv;
        }
      }
      this.setData({
        conversations: conversations.sort(this.sorter),
      });
    }));

    await this.refresh();

    // const switches = await getNotifySwitches();
    // if (switches.mainSwitch) {
    //   if (![
    //     NotifyType.BookingRequest, NotifyType.BookingAgreed, NotifyType.Chat
    //   ].every(t => switches[t])) {
    //     this.setData({
    //       showNotifyTip: true
    //     })
    //   }
    // }
  },
  onUnload() {
    this.subscription?.unsubscribe();
  },
  async onShow() {
  },
  sorter: (a: ConversationItem, b: ConversationItem) => b.latestMsgSendTime - a.latestMsgSendTime,
  async onConversationListUpdate(convList: ConversationItem[]) {
    const list = convList
      .filter(conv =>
        conv.groupID && isTransactionGroup(conv.groupID)
        && !isOthersNewCreateConversation(conv)
      )
      .sort(this.sorter);
    this.setData({
      conversations: list,
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
  async refresh() {
    await this.onConversationListUpdate(await getConversationList());
  },
  async onRefresh() {
    if (this.data.refreshing) {
      return;
    }
    this.setData({ refreshing: true });
    try {
      await this.refresh();
    } catch (e) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error'
      })
    } finally {
      await sleep(500);
      this.setData({ refreshing: false });
    }
  },
  requestNotifySubscribe() {
    requestNotifySubscribe([NotifyType.BookingRequest, NotifyType.BookingAgreed, NotifyType.Chat]).then();
  },
})