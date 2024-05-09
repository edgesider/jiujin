import getConstants from '../../../../constants';
import { Subscription } from 'rxjs';
import { kbHeightChanged, tryJsonParse } from '../../../../utils/other';
import { MessageItem, MessageType } from 'open-im-sdk';
import {
  checkOimResult,
  getConversationById,
  getImUidFromUid,
  listenMessage,
  markConvMessageAsRead
} from '../../../../utils/oim';

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
    messageList: [] as MessageItem[], // 消息列表，旧消息在前
    nextMsgId: null as string | null,
    lastMinSeq: 0,
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
      markConvMessageAsRead(conversationId).then();

      this.getSubscription().add(listenMessage(conversationId).subscribe(rawMsg => {
        this.onMessageUpdate([rawMsg], 'newer');
        this.scrollToEnd();
        markConvMessageAsRead(conversationId).then();
      }));
      this.getSubscription().add(kbHeightChanged.subscribe(() => {
        this.scrollToEnd();
      }))
    },
    scrollToEnd() {
      const { messageList } = this.data;
      if (messageList.length > 0) {
        const last = messageList[messageList.length - 1];
        setTimeout(() => {
          this.setData({ scrollIntoView: `seq-${last.seq}` });
        }, 50);
      }
    },
    onMessageUpdate(newList: MessageItem[], type: 'older' | 'newer') {
      newList = newList.filter(msg => {
        return msg.contentType === MessageType.TextMessage || msg.contentType === MessageType.PictureMessage;
      });
      newList.forEach(msg => {
        const custom = tryJsonParse(msg.ex);
        if (custom?.needUpdateTransaction) {
          // @ts-ignore
          msg.__isTransactionStatusMessage = true
        }
      })
      this.data.messageList.splice(type === 'older' ? 0 : this.data.messageList.length, 0, ...newList);
      this.setData({ messageList: this.data.messageList });
    },
    async fetchOlderMessages() {
      const { conversationId } = this.properties;
      const { lastMinSeq, isCompleted } = this.data;
      if (!conversationId || isCompleted) {
        return;
      }
      const newList = checkOimResult(await oim.getAdvancedHistoryMessageList({
        conversationID: conversationId,
        count: 12,
        startClientMsgID: '',
        lastMinSeq,
      }));
      this.setData({
        isCompleted: newList.isEnd,
        lastMinSeq: newList.lastMinSeq
      })
      this.onMessageUpdate(newList.messageList, 'older');
    },
    onImageMessageClick(ev: TouchEvent) {
      const { idx } = ev.currentTarget.dataset;
      const msg = this.data.messageList[idx];
      if (msg && msg.contentType === MessageType.PictureMessage) {
        // TODO
        // const url = msg.payload.imageInfoArray[0].url;
        // const msgs = this.data.messageList
        //   .filter(msg => msg.type === tim.TYPES.MSG_IMAGE)
        //   .map(msg => msg.payload.imageInfoArray[0].url);
        // wx.previewImage({
        //   current: url,
        //   urls: msgs
        // })
      }
    },
  }
});
