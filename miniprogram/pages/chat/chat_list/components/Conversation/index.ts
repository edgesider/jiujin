import moment from 'moment';
import api, { getOpenId } from '../../../../../api/api';
import { Resp } from '../../../../../api/resp';
import { User } from '../../../../../types';
import { openConversationDetail } from '../../../../../utils/router';
import { Subscription } from 'rxjs';
import { DATETIME_FORMAT } from '../../../../../utils/time';
import { NotifyType, requestNotifySubscribe } from '../../../../../utils/notify';
import {
  getCommodityGroupAttributes,
  getConversationById,
  getGroup, getHelpGroupAttributes, isOthersNewCreateConversation,
  listenConversation
} from '../../../../../utils/oim';
import { ConversationItem, MessageItem, MessageType } from '../../../../../lib/openim/index';

Component({
  properties: {
    conversationId: {
      type: String,
      // 不支持更新
      // observer(newVal, oldVal)
    },
    conversationIndex: {
      type: Number
    },
    updateIndex: {
      type: Number,
      observer() {
        this.update();
      }
    },
    // 是否一开始隐藏，在有信息之后再展示
    hideAtFirst: {
      type: Boolean,
      value: false
    }
  },
  data: {
    hide: false,
    conversation: null as ConversationItem | null,
    lastMessageText: '',
    lastTime: '',
    /** 对方用户的信息 */
    peerUser: null as User | null,
  },
  lifetimes: {
    async attached() {
      if (this.properties.hideAtFirst) {
        this.setData({
          hide: true,
        });
      }
      await this.update();
      // @ts-ignore
      this.subscription =
        listenConversation(this.properties.conversationId).subscribe(conv => {
          this.onConversationUpdate(conv, true);
        });
    },
    detached() {
      // @ts-ignore
      (this.subscription as Subscription | undefined)
        ?.unsubscribe();
    }
  },
  methods: {
    async update() {
      const conversation = await getConversationById(this.properties.conversationId);
      if (!conversation) {
        console.error(`invalid conversationId ${this.properties.conversationId}`);
        return;
      }
      await this.onConversationUpdate(conversation, true);
    },
    async onConversationUpdate(conversation: ConversationItem, updateOtherInfo: boolean) {
      if (isOthersNewCreateConversation(conversation)) {
        return;
      }
      const { latestMsg } = conversation;
      const lastMessage = JSON.parse(latestMsg) as MessageItem;
      let lastMessageText = '';
      if (!lastMessage) {
        lastMessageText = ''
        // } else if (lastMessage.isRevoked) {
        //   lastMessageText = `${lastMessage.fromAccount === getImUidFromUid(getOpenId()) ? '我' : '对方'}撤回了一条消息`;
      } else if (lastMessage.contentType === MessageType.TextMessage) {
        lastMessageText = lastMessage.textElem.content;
      } else if (lastMessage.contentType === MessageType.PictureMessage) {
        lastMessageText = '[图片]';
      }
      this.setData({
        conversation,
        lastMessageText,
        lastTime: moment(lastMessage.sendTime).format(DATETIME_FORMAT),
      });

      // 由于tim频控限制比较严格，所以只在第一次更新属性信息
      if (updateOtherInfo || !this.data.peerUser) {
        const group = await getGroup(conversation.groupID);
        if (!group) {
          throw Error(`failed to get group: groupId=${conversation.groupID}`)
        }
        const attrs = (await getCommodityGroupAttributes(group)) || (await getHelpGroupAttributes(group));
        if (!attrs) {
          console.error(`not commodity/help conversation ${group.groupID} ${group.ownerUserID}`);
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
