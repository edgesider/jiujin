import getConstants from '../../../constants';
import { Conversation, Message } from '@tencentcloud/chat';
import { getConversationById, listenConversation, listenMessage } from '../../../utils/im';
import { tryJsonParse } from '../../../utils/other';
import { Commodity, convertCommodity, User } from '../../../types';
import moment from 'moment';

const app = getApp();

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
    messages: [] as NotifyMsg[],
  },
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

    listenMessage(conv.conversationID).subscribe(rawMsg => {
      const msg = this.convertRawMsg(rawMsg);
      if (msg) {
        this.setData({
          messages: [msg, ...this.data.messages]
        });
      }
    });
    listenConversation(conv.conversationID).subscribe(conv => {
      this.setData({ conversation: conv });
    })
    const rawMsgList: Message[] = (await tim.getMessageList(conv)).data?.messageList ?? [];
    this.onMessageUpdate(rawMsgList);
  },
  onMessageUpdate(rawMsgList: Message[]) {
    const msgList = rawMsgList
      .map(this.convertRawMsg)
      .filter((msg): msg is NotifyMsg => Boolean(msg));
    this.setData({ messages: msgList });
    if (this.data.conversation) {
      tim.setMessageRead(this.data.conversation).then();
    }
  },
  convertRawMsg(rawMsg: Message): NotifyMsg | undefined {
    try {
      const payload: NotifyPayload = tryJsonParse(rawMsg.payload.text);
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
        timeStr: moment(time).format('YYYY-MM-DD HH:mm'),
        seq: rawMsg.sequence,
        ...payload
      };
    } catch (e) {
      console.error(e);
      return undefined;
    }
  },
  async onUnload() {
    if (this.data.conversation) {
      tim.setMessageRead(this.data.conversation).then();
    }
  }
})