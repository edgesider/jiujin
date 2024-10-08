import getConstants from '../../../constants';
import { tryJsonParse } from '../../../utils/other';
import { Commodity, convertCommodity, convertHelp, Help, User } from '../../../types';
import moment from 'moment';
import { openCommodityDetail, openHelpDetail } from '../../../utils/router';
import { Subscription } from 'rxjs';
import { DATETIME_FORMAT } from '../../../utils/time';
import {
  checkOimResult,
  getConversationById,
  listenConversation,
  listenMessage,
  markConvMessageAsRead
} from '../../../utils/oim';
import { ConversationItem, MessageItem, MessageType } from '../../../lib/openim/index';
import { decodeOptions, getContentDesc } from '../../../utils/strings';

type CustomEvent = WechatMiniprogram.CustomEvent;

const COUNT_PER_PAGE = 20;

export interface BaseNotifyPayload {
  text: string;
  operator?: User;
}

export interface SimpleNotifyPayload extends BaseNotifyPayload {
  type: 'simple';
  title: string;
}

export interface CommodityNotifyPayload extends BaseNotifyPayload {
  commodity: Commodity;
  commodityDesc: string;
}

export interface CommodityCommentNotifyPayload extends CommodityNotifyPayload {
  type: 'comment';
}

export interface CommodityStarNotifyPayload extends CommodityNotifyPayload {
  type: 'collect';
}

export interface HelpNotifyPayload extends BaseNotifyPayload {
  help: Help;
  helpDesc: string;
}

export interface HelpCommentNotifyPayload extends HelpNotifyPayload {
  type: 'help_comment';
}

export interface HelpStarNotifyPayload extends HelpNotifyPayload {
  type: 'help_collect';
}

export interface HelpLikeNotifyPayload extends HelpNotifyPayload {
  type: 'help_like';
}

export type NotifyPayload =
  | CommodityCommentNotifyPayload
  | CommodityStarNotifyPayload
  | HelpCommentNotifyPayload
  | HelpStarNotifyPayload
  | HelpLikeNotifyPayload
  | SimpleNotifyPayload
  ;

export type NotifyMsg = NotifyPayload & {
  rawClientId: string;
  time: number;
  timeStr: string;
  seq: number;
};

Page({
  data: {
    ...getConstants(),
    convName: '',
    state: 'loading' as 'loading' | 'empty' | 'error',
    conversation: null as ConversationItem | null,
    messages: [] as NotifyMsg[], // 消息列表，新消息在前
    lastMinSeq: 0,
    isCompleted: false,
  },
  subscription: null as Subscription | null,
  async onLoad(options) {
    options = decodeOptions(options);
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
    markConvMessageAsRead(conv).then();
  },
  async onUnload() {
    this.subscription?.unsubscribe();
    if (this.data.conversation) {
      markConvMessageAsRead(this.data.conversation).then();
    }
  },
  /**
   * 更新消息列表
   * @param rawMsgList 原始的消息列表，需要确保最新的消息在前面
   * @param mode 添加方式
   */
  onMessageUpdate(rawMsgList: MessageItem[], mode: 'newer' | 'older' | 'replace') {
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
  convertRawMsg(rawMsg: MessageItem): NotifyMsg | undefined {
    try {
      if (rawMsg.contentType !== MessageType.TextMessage) {
        return;
      }
      const payload: NotifyPayload | null = tryJsonParse(rawMsg.textElem.content);
      if (!payload) {
        console.log('invalid notify message', rawMsg);
        return;
      }
      if (payload.type === 'comment' || payload.type === 'collect') {
        payload.commodity = convertCommodity(payload.commodity);
        payload.commodityDesc = getContentDesc(payload.commodity.content);
      } else if (payload.type === 'help_like' || payload.type === 'help_collect' || payload.type === 'help_comment') {
        payload.help = convertHelp(payload.help);
        payload.helpDesc = getContentDesc(payload.help.content);
      } else if (!payload.type) {
        // simple msg
      }
      const time = rawMsg.sendTime;
      return {
        rawClientId: rawMsg.clientMsgID,
        time,
        timeStr: moment(time).format(DATETIME_FORMAT),
        seq: rawMsg.seq,
        ...payload
      };
    } catch (e) {
      console.warn(e);
      return undefined;
    }
  },
  async fetchMoreMessages() {
    const { messages, conversation, lastMinSeq, isCompleted } = this.data;
    if (!conversation || isCompleted) {
      return;
    }
    const lastMsgId = messages.length === 0 ? '' : messages[messages.length - 1].rawClientId;
    const newList = checkOimResult(await oim.getAdvancedHistoryMessageList({
      conversationID: conversation.conversationID,
      count: COUNT_PER_PAGE,
      startClientMsgID: lastMsgId,
      lastMinSeq,
    }));
    this.setData({
      isCompleted: newList.isEnd,
      lastMinSeq: newList.lastMinSeq,
    })
    this.onMessageUpdate(newList.messageList.reverse(), 'older');
  },
  async onReachBottom() {
    await this.fetchMoreMessages();
  },
  async gotoDetail(ev: CustomEvent) {
    const msg = ev.currentTarget.dataset.msg as NotifyMsg;
    if (msg.type === 'comment' || msg.type === 'collect') {
      await openCommodityDetail({ id: msg.commodity._id, scrollToComment: msg.type === 'comment' });
    } else if (msg.type === 'help_like' || msg.type === 'help_collect' || msg.type === 'help_comment') {
      await openHelpDetail({ id: msg.help._id, scrollToComment: msg.type === 'help_comment' });
    }
  },
})