import getConstants from '../../../../constants';
import { Subscription } from 'rxjs';
import { kbHeightChanged, sleep, tryJsonParse } from '../../../../utils/other';
import { MessageItem, MessageType } from '../../../../lib/openim/index';
import {
  checkOimResult,
  getConversationById,
  getImUidFromUid,
  listenMessage,
  markConvMessageAsRead
} from '../../../../utils/oim';
import { openProfile } from '../../../../utils/router';
import moment from 'moment';
import { IM_TIME_FORMAT } from '../../../../utils/time';

type TouchEvent = WechatMiniprogram.TouchEvent;
const app = getApp();
const COUNT_PER_PAGE = 30;

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
    lastMinSeq: 0,
    isCompleted: false,
    scrollIntoView: null as string | null,
    pullDownTriggered: false,
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

      await this.fetchOlderMessages();
      setTimeout(() => {
        this.scrollToEnd();
      }, 100);
      markConvMessageAsRead(conversationId).then();

      this.getSubscription().add(listenMessage(conversationId).subscribe(rawMsg => {
        this.onMessageUpdate([rawMsg], 'newer');
        setTimeout(() => {
          this.scrollToEnd();
        }, 100)
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
      for (let i = 0; i < newList.length; i++) {
        const msg = newList[i];
        const custom = tryJsonParse(msg.ex);
        if (custom?.needUpdateTransaction) {
          // @ts-ignore
          msg.__isTransactionStatusMessage = true
        }

        const prevMsg = newList[i - 1];
        if (i === 0 || (prevMsg && msg.sendTime - prevMsg.sendTime > 2 * 60 * 1000 /* 2min */)) {
          // @ts-ignore
          msg.__showTime = true;
          // @ts-ignore
          msg.__sendTimeStr = moment(msg.sendTime).format(IM_TIME_FORMAT);
        }
      }
      this.data.messageList.splice(type === 'older' ? 0 : this.data.messageList.length, 0, ...newList);
      this.setData({ messageList: this.data.messageList });
    },
    async fetchOlderMessages() {
      const { conversationId } = this.properties;
      const { lastMinSeq, isCompleted } = this.data;
      if (!conversationId || isCompleted) {
        return;
      }
      const lastMsgId = this.data.messageList.length === 0 ? '' : this.data.messageList[0].clientMsgID;
      const newList = checkOimResult(await oim.getAdvancedHistoryMessageList({
        conversationID: conversationId,
        count: COUNT_PER_PAGE,
        startClientMsgID: lastMsgId,
        lastMinSeq,
      }));
      this.setData({
        isCompleted: newList.isEnd,
        lastMinSeq: newList.lastMinSeq
      })
      this.onMessageUpdate(newList.messageList, 'older');
    },
    async onPullDown() {
      this.setData({ pullDownTriggered: true });
      this.triggerEvent('onPullDown');
      await this.fetchOlderMessages();
      await sleep(500);
      this.setData({ pullDownTriggered: false });
    },
    onImageMessageClick(ev: TouchEvent) {
      const { idx } = ev.currentTarget.dataset;
      const msg = this.data.messageList[idx];
      if (msg && msg.contentType === MessageType.PictureMessage) {
        const url = msg.pictureElem.bigPicture.url;
        const urls = this.data.messageList
          .filter(msg => msg.contentType === MessageType.PictureMessage)
          .map(msg => msg.pictureElem.bigPicture.url);
        wx.previewImage({
          current: `${url}/detail`,
          urls: urls.map(u => `${u}/detail`),
        })
      }
    },
    onAvatarClick(ev: TouchEvent) {
      const { uid } = ev.target.dataset;
      openProfile(uid).then();
    }
  }
});
