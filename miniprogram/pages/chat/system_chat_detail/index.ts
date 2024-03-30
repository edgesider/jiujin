import getConstants from '../../../constants';
import { Conversation, Message } from '@tencentcloud/chat';
import { getConversationById, listenMessage } from '../../../utils/im';
import { tryJsonParse } from '../../../utils/other';

const app = getApp();

interface BaseNotifyPayload {
  text: string;
}

interface CommentNotifyPayload extends BaseNotifyPayload {
  type: 'comment';
  commodityId: string;
  commentContent: string;
  commentId?: number; // TODO
  user: string;
}

interface StarNotifyPayload extends BaseNotifyPayload {
  type: 'collect';
  commodityId: string;
  commodityDesc: string;
  user: string;
}

interface LikeNotifyPayload extends BaseNotifyPayload {
  type: 'like';
}

type NotifyPayload = CommentNotifyPayload | StarNotifyPayload | LikeNotifyPayload;
type NotifyMsg = NotifyPayload & {
  rawId: string;
  time: number;
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
    const rawMsgList: Message[] = (await tim.getMessageList(conv)).data?.messageList ?? [];
    this.onMessageUpdate(rawMsgList);
    listenMessage(conv.conversationID).subscribe(rawMsg => {
      const msg = this.convertRawMsg(rawMsg);
      if (msg) {
        this.setData({
          messages: [msg, ...this.data.messages]
        });
      }
    })
  },
  convertRawMsg(rawMsg: Message): NotifyMsg | undefined {
    const payload: NotifyPayload = tryJsonParse(rawMsg.payload.text);
    if (!payload || !payload.type) {
      return;
    }
    return {
      rawId: rawMsg.ID,
      time: rawMsg.time * 1000 + rawMsg.sequence,
      seq: rawMsg.sequence,
      ...payload
    };
  },
  onMessageUpdate(rawMsgList: Message[]) {
    const msgList = rawMsgList
      .map(this.convertRawMsg)
      .filter((msg): msg is NotifyMsg => Boolean(msg));
    this.setData({ messages: msgList });
  },
  async onShow() {
  },
})