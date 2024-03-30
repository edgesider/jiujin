import getConstants from '../../../constants';
import { setTabBar, sleep } from '../../../utils/other';
import { Conversation, Message } from '@tencentcloud/chat';
import { User } from '../../../types';

const app = getApp();

interface SmallConversation {
  name: string;
  avatar: string;
  sellerId: string;
  seller?: User;
  commodityId: string;
  transactionId: number,
  lastMessage: Message;
  unreadCount: number;
  lastTime: string;
}

Page({
  data: {
    ...getConstants(),
    conversations: [] as Conversation[],
    refreshing: false,
  },
  async onLoad() {
    setTabBar(this);

    tim.on(tim.EVENT.CONVERSATION_LIST_UPDATED, (event: any) => {
      this.onConversationListUpdate(event.data);
    })
  },
  async onShow() {
    await this.refresh();
  },
  async onConversationListUpdate(conversationList: Conversation[]) {
    this.setData({
      conversations: conversationList.filter(conv => conv.groupProfile),
    });
  },
  async refresh() {
    await this.onConversationListUpdate(
      (await tim.getConversationList()).data.conversationList as Conversation[]);
  },
  async onRefresh() {
    this.setData({ refreshing: true });
    try {
      await this.refresh();
    } catch (e){
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