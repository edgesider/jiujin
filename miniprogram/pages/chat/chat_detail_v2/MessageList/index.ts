import getConstants from '../../../../constants';
import { Message } from '@tencentcloud/chat';
import { getConversationById, getImUidFromUid, listenMessage } from '../../../../utils/im';

const app = getApp();
const COUNT_PER_PAGE = 20;

Component({
  properties: {
    conversationId: {
      type: String,
      observer(newVal, oldVal) {
        if (!oldVal && newVal) {
          this.init(newVal);
        }
      }
    },
  },
  data: {
    ...getConstants(),
    selfImId: null as string | null,
    messageList: [] as Message[], // 消息列表，旧消息在前
    nextMsgId: null as string | null,
    isCompleted: false,
    scrollIntoView: null as string | null,
  },
  lifetimes: {
    attached() {
    }
  },
  methods: {
    async init(conversationId: string) {
      this.setData({ selfImId: getImUidFromUid(app.globalData.self._id) });
      const conv = await getConversationById(conversationId);
      if (!conv) {
        await wx.showToast({ title: '网络错误', icon: 'error' });
        throw Error('getConversationById failed');
      }

      await this.fetchOlderMessages();
      setTimeout(() => {
        this.scrollToEnd();
      }, 50);
      tim.setMessageRead({ conversationID: conversationId, }).then();
      listenMessage(conversationId).subscribe(rawMsg => {
        this.onMessageUpdate([rawMsg], 'newer');
      });
    },
    scrollToEnd() {
      const { messageList } = this.data;
      if (messageList.length > 0) {
        const last = messageList[messageList.length - 1];
        this.setData({ scrollIntoView: `seq-${last.sequence}` });
      }
    },
    onMessageUpdate(newList: Message[], type: 'older' | 'newer') {
      this.data.messageList.splice(type === 'older' ? 0 : this.data.messageList.length - 1, 0, ...newList);
      this.setData({ messageList: this.data.messageList });
    },
    async fetchOlderMessages() {
      const { conversationId } = this.properties;
      const { nextMsgId, isCompleted } = this.data;
      if (!conversationId || isCompleted) {
        return;
      }
      const newList = await tim.getMessageList({
        conversationID: conversationId,
        nextReqMessageID: nextMsgId ?? undefined,
        // @ts-ignore
        count: COUNT_PER_PAGE,
      });
      this.setData({
        isCompleted: newList.data.isCompleted,
        nextMsgId: newList.data.nextReqMessageID,
      })
      this.onMessageUpdate(newList.data.messageList, 'older');
    },
  }
});
