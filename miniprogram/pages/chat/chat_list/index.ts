import getConstants from '../../../constants';
import { setTabBar, sleep } from '../../../utils/other';
import { Conversation, Message } from '@tencentcloud/chat';
import { User } from '../../../types';
import { isGroupIdForTransaction, listenConversationListUpdate } from '../../../utils/im';
import { Subscription } from 'rxjs';

const app = getApp();

Page({
  data: {
    ...getConstants(),
    conversations: [] as Conversation[],
    refreshing: false,
    self: null as User | null,
  },
  subscription: null as Subscription | null,
  async onLoad() {
    setTabBar(this, () => {
      this.onRefresh();
    });
    this.setData({
      self: app.globalData.self
    });

    this.subscription = listenConversationListUpdate().subscribe(list => {
      this.onConversationListUpdate(list);
    })
  },
  onUnload() {
    console.log(this.subscription);
    this.subscription?.unsubscribe()
  },
  async onShow() {
    await this.refresh();
  },
  async onConversationListUpdate(conversationList: Conversation[]) {
    this.setData({
      conversations: conversationList
        .filter(conv => conv.groupProfile && isGroupIdForTransaction(conv.groupProfile.groupID)),
    });

    const { self } = this.data;
    if (self) {
      for (const conv of conversationList) {
        if ([self.collect_group_id, self.comment_group_id, self.like_group_id]
          .indexOf(conv.groupProfile?.groupID) > 0) {
          if (conv.isPinned) {
            continue;
          }
          console.log(`pinning system conversation ${conv.conversationID}`);
          await tim.pinConversation({
            conversationID: conv.conversationID,
            isPinned: true
          });
        }
      }
    }
  },
  async refresh() {
    await this.onConversationListUpdate(
      (await tim.getConversationList()).data.conversationList as Conversation[]);
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
})