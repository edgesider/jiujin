import moment from 'moment';
import { Conversation } from '@tencentcloud/chat';
import {
  CommodityGroupAttributes,
  getCommodityGroupAttributes,
  getConversationById, getImUidFromUid, listenConversation, tryDeleteConversationAndGroup,
} from '../../../../../utils/im';
import api, { getOpenId } from '../../../../../api/api';
import { Resp } from '../../../../../api/resp';
import { User } from '../../../../../types';
import { openConversationDetail } from '../../../../../utils/router';
import { Subscription } from 'rxjs';
import { sleep } from '../../../../../utils/other';
import { DATETIME_FORMAT } from '../../../../../utils/time';
import { NotifyType, requestNotifySubscribe } from '../../../../../utils/notify';

Component({
  properties: {
    conversationId: {
      type: String,
      // 不支持更新
      // observer(newVal, oldVal) {}
    },
    conversationIndex: {
      type: Number
    },
  },
  data: {
    conversation: null as Conversation | null,
    lastMessageText: '',
    lastTime: '',
    /** 对方用户的信息 */
    peerUser: null as User | null,
  },
  lifetimes: {
    async attached() {
      const conversation = await getConversationById(this.properties.conversationId);
      if (!conversation) {
        console.error(`invalid conversationId ${this.properties.conversationId}`);
        return;
      }
      this.onConversationUpdate(conversation, true);
      // @ts-ignore
      this.subscription =
        listenConversation(this.properties.conversationId).subscribe(conv => {
          this.onConversationUpdate(conversation, false);
        });
    },
    detached() {
      // @ts-ignore
      (this.subscription as Subscription | undefined)
        ?.unsubscribe();
    }
  },
  methods: {
    async onConversationUpdate(conversation: Conversation, updateOtherInfo: boolean) {
      const { lastMessage } = conversation;
      let lastMessageText = '';
      if (!lastMessage) {
        lastMessageText = ''
      } else if (lastMessage.isRevoked) {
        lastMessageText = `${lastMessage.fromAccount === getImUidFromUid(getOpenId()) ? '我' : '对方'}撤回了一条消息`;
      } else if (lastMessage.type !== 'TIMCustomElem' && lastMessage.type !== 'TIMGroupTipElem') {
        lastMessageText = conversation.lastMessage.messageForShow;
      }
      this.setData({
        conversation,
        lastMessageText,
        lastTime: moment(conversation.lastMessage.lastTime * 1000).format(DATETIME_FORMAT),
      });

      // 由于tim频控限制比较严格，所以只在第一次更新属性信息
      if (updateOtherInfo) {
        const group = conversation.groupProfile;
        let attrs: CommodityGroupAttributes | undefined;
        // 刚建好群属性可能还没同步，多等一下
        for (let i = 0; i < 3; i++) {
          attrs = await getCommodityGroupAttributes(group);
          if (attrs) {
            break;
          }
          await sleep(500);
        }
        if (!attrs) {
          console.error(`not commodity conversation ${group.groupID} ${group.ownerID}`);
          return;
        }
        const peerUid = attrs.sellerId === getOpenId() ? attrs.buyerId : attrs.sellerId;
        const peerUser: Resp<User> = await api.getUserInfo(peerUid);
        if (peerUser.isError) {
          console.error(`failed to get user info for ${peerUid}`);
        } else {
          this.setData({
            peerUser: peerUser.data
          })
        }
      }
    },
    async gotoDetail() {
      requestNotifySubscribe([NotifyType.Chat, NotifyType.BookingRequest, NotifyType.BookingAgreed]).then()
      await openConversationDetail(this.properties.conversationId as string);
    },
  }
})
