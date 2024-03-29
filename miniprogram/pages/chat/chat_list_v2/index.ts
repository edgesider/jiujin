import getConstants from '../../../constants';
import { setTabBar } from '../../../utils/other';
import { Conversation, Message } from '@tencentcloud/chat';
import moment from 'moment';
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
  },
  async onLoad() {
    setTabBar(this);

    tim.on(tim.EVENT.CONVERSATION_LIST_UPDATED, (event: any) => {
      this.onConversationListUpdate(event.data);
    })
  },
  async onShow() {
    await this.onConversationListUpdate(
      (await tim.getConversationList()).data.conversationList as Conversation[]);
  },
  async onConversationListUpdate(conversationList: Conversation[]) {
    this.setData({
      conversations: conversationList.filter(conv => conv.groupProfile),
    });
  },
})