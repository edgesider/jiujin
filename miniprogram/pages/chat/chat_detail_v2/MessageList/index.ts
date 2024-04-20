import getConstants from '../../../../constants';
import { Message } from '@tencentcloud/chat';
import { getConversationById, getImUidFromUid, listenMessage } from '../../../../utils/im';
import { Subscription } from 'rxjs';

type TouchEvent = WechatMiniprogram.TouchEvent;
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
      // @ts-ignore
      this.subscription = new Subscription();
    },
    detached() {
      // @ts-ignore
      (this.subscription as Subscription)?.unsubscribe();
    }
  },
  methods: {
    // @ts-ignore
    subscription: null as Subscription | null,
    getSubscription(): Subscription {
      // @ts-ignore
      return this.subscription!!;
    },
    async init(conversationId: string) {
      this.setData({ selfImId: getImUidFromUid(app.globalData.self._id) });
      const conv = await getConversationById(conversationId);
      if (!conv) {
        await wx.showToast({ title: '网络错误', icon: 'error' });
        throw Error('getConversationById failed');
      }

      await this.fetchOlderMessages();
      this.scrollToEnd();
      tim.setMessageRead({ conversationID: conversationId, }).then();

      this.getSubscription().add(listenMessage(conversationId).subscribe(rawMsg => {
        this.onMessageUpdate([rawMsg], 'newer');
        this.scrollToEnd();
        tim.setMessageRead({ conversationID: conversationId });
      }));
    },
    scrollToEnd() {
      const { messageList } = this.data;
      if (messageList.length > 0) {
        const last = messageList[messageList.length - 1];
        setTimeout(() => {
          this.setData({ scrollIntoView: `seq-${last.sequence}` });
        }, 50);
      }
    },
    onMessageUpdate(newList: Message[], type: 'older' | 'newer') {
      newList = newList.filter(msg => {
        return msg.type === tim.TYPES.MSG_TEXT || msg.type === tim.TYPES.MSG_IMAGE;
      });
      this.data.messageList.splice(type === 'older' ? 0 : this.data.messageList.length, 0, ...newList);
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
    onImageMessageClick(ev: TouchEvent) {
      const { idx } = ev.currentTarget.dataset;
      const msg = this.data.messageList[idx];
      if (msg && msg.type === tim.TYPES.MSG_IMAGE) {
        const url = msg.payload.imageInfoArray[0].url;
        const msgs = this.data.messageList
          .filter(msg => msg.type === tim.TYPES.MSG_IMAGE)
          .map(msg => msg.payload.imageInfoArray[0].url);
        wx.previewImage({
          current: url,
          urls: msgs
        })
      }
    },
  }
});
