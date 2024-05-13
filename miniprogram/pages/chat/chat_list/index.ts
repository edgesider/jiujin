import getConstants from '../../../constants';
import { setTabBar, sleep } from '../../../utils/other';
import { User } from '../../../types';
import { Subscription } from 'rxjs';
import { NotifyType, requestNotifySubscribe } from '../../../utils/notify';
import {
  getConversationList,
  isOthersNewCreateConversation,
  isTransactionGroup, listenConversation, listenConversations, listenNewConvList,
} from '../../../utils/oim';
import { ConversationItem } from 'open-im-sdk';

const app = getApp();

Page({
  data: {
    ...getConstants(),
    conversations: [] as ConversationItem[],
    refreshing: false,
    self: null as User | null,
    showNotifyTip: false,
  },
  subscription: null as Subscription | null,
  async onLoad() {
    setTabBar(this, () => {
      this.onRefresh();
    });
    this.setData({ self: app.globalData.self });

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
    await this.refresh();
  },
  sorter: (a: ConversationItem, b: ConversationItem) => b.latestMsgSendTime - a.latestMsgSendTime,
  async onConversationListUpdate(convList: ConversationItem[]) {
    this.setData({
      conversations: convList
        .filter(conv => conv.groupID && isTransactionGroup(conv.groupID))
        .sort(this.sorter)
    });

    const { self } = this.data;
    if (self) {
      for (const conv of convList) {
        if ([self.collect_group_id, self.comment_group_id, self.like_group_id]
          .indexOf(conv.groupID) > 0) {
          if (conv.isPinned) {
            continue;
          }
          console.log(`pinning system conversation ${conv.conversationID}`);
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