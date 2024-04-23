import getConstants from '../../../constants';
import { Conversation, Message } from '@tencentcloud/chat';
import { getConversationById, listenConversation, listenMessage } from '../../../utils/im';
import { tryJsonParse } from '../../../utils/other';
import { Commodity, convertCommodity, User } from '../../../types';
import moment from 'moment';
import { openCommodityDetail } from '../../../utils/router';
import { Subscription } from 'rxjs';
import { DATETIME_FORMAT } from '../../../utils/time';

type CustomEvent = WechatMiniprogram.CustomEvent;

const COUNT_PER_PAGE = 20;

interface BaseNotifyPayload {
  text: string;
  operator?: User;
}

interface CommentNotifyPayload extends BaseNotifyPayload {
  type: 'comment';
  commodity: Commodity;
  commentId?: number; // TODO
}

interface StarNotifyPayload extends BaseNotifyPayload {
  type: 'collect';
  commodity: Commodity;
}

interface LikeNotifyPayload extends BaseNotifyPayload {
  type: 'like';
}

type NotifyPayload = CommentNotifyPayload | StarNotifyPayload | LikeNotifyPayload;
type NotifyMsg = NotifyPayload & {
  rawId: string;
  time: number;
  timeStr: string;
  seq: number;
};

Page({
  data: {
    ...getConstants(),
    convName: '',
    state: 'loading' as 'loading' | 'empty' | 'error',
    conversation: null as Conversation | null,
    messages: [] as NotifyMsg[], // 消息列表，新消息在前
    nextMsgId: null,
    isCompleted: false,
  },
  subscription: null as Subscription | null,
  async onLoad(options) {
    const { conversationId, convName } = options;
    this.setData({ convName });
    if (!conversationId) {
      // 用户可能刚注册，还没有创建会话
      this.setData({ state: 'empty' });
      return;
    }
    const conv = await getConversationById(conversationId);
    if (!conv) {
      console.error(`failed to get conversation detail: conversationId=${conversationId}`);
      this.setData({ state: 'error' });
      return;
    }
    this.setData({ conversation: conv });

    const subscription = new Subscription();

    subscription.add(listenConversation(conv.conversationID).subscribe(conv => {
      this.setData({ conversation: conv });
    }));
    subscription.add(listenMessage(conv.conversationID).subscribe(rawMsg => {
      this.onMessageUpdate([rawMsg], 'newer');
    }));
    this.subscription = subscription;
    await this.fetchMoreMessages();
  },
  async onUnload() {
    this.subscription?.unsubscribe();
    if (this.data.conversation) {
      tim.setMessageRead(this.data.conversation).then();
    }
  },
  /**
   * 更新消息列表
   * @param rawMsgList 原始的消息列表，需要确保最新的消息在前面
   * @param mode 添加方式
   */
  onMessageUpdate(rawMsgList: Message[], mode: 'newer' | 'older' | 'replace') {
    const msgList = rawMsgList
      .map(this.convertRawMsg)
      .filter((msg): msg is NotifyMsg => Boolean(msg));
    if (mode === 'replace') {
      this.setData({ messages: msgList });
    } else {
      const { messages } = this.data;
      if (mode === 'newer') {
        messages.splice(0, 0, ...msgList);
      } else if (mode === 'older') {
        messages.push(...msgList);
      }
      this.setData({ messages });
    }
  },
  convertRawMsg(rawMsg: Message): NotifyMsg | undefined {
    try {
      const payload: NotifyPayload | null = tryJsonParse(rawMsg.payload.text);
      if (!payload || !payload.type) {
        return;
      }
      if (payload.type === 'comment' || payload.type === 'collect') {
        payload.commodity = convertCommodity(payload.commodity);
      }
      const time = rawMsg.time * 1000 + rawMsg.sequence;
      return {
        rawId: rawMsg.ID,
        time: rawMsg.time * 1000 + rawMsg.sequence,
        timeStr: moment(time).format(DATETIME_FORMAT),
        seq: rawMsg.sequence,
        ...payload
      };
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  },
  async fetchMoreMessages() {
    const { conversation, nextMsgId, isCompleted } = this.data;
    if (!conversation || isCompleted) {
      return;
    }
    const newList = await tim.getMessageList({
      conversationID: conversation.conversationID,
      nextReqMessageID: nextMsgId ?? undefined,
      // @ts-ignore
      count: COUNT_PER_PAGE,
    });
    this.setData({
      isCompleted: newList.data.isCompleted,
      nextMsgId: newList.data.nextReqMessageID,
    })
    this.onMessageUpdate(newList.data.messageList.reverse(), 'older');
  },
  async onReachBottom() {
    await this.fetchMoreMessages();
  },
  async gotoDetail(ev: CustomEvent) {
    const msg = ev.currentTarget.dataset.msg as NotifyMsg;
    if (msg.type === 'comment' || msg.type === 'collect') {
      await openCommodityDetail({ id: msg.commodity._id, scrollToComment: msg.type === 'comment' });
    }
  },
})