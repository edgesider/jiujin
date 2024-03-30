import moment from 'moment';
import { Conversation } from '@tencentcloud/chat';
import {
  getCommodityGroupAttributes,
  getConversationById, listenConversation, tryDeleteConversationAndGroup,
} from '../../../../../utils/im';
import api, { getOpenId } from '../../../../../api/api';
import { Resp } from '../../../../../api/resp';
import { User } from '../../../../../types';
import { openConversationDetail } from '../../../../../router';
import { Subscription } from 'rxjs';

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
    lastTime: '',
    /** 对方用户的信息 */
    peerUser: null as User | null,
  },
  lifetimes: {
    created() {
    },
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
      this.setData({
        conversation,
        lastTime: moment(conversation.lastMessage.lastTime * 1000).format('YYYY-MM-DD HH:mm'),
      });

      // 由于tim频控限制比较严格，所以只在第一次更新属性信息
      if (updateOtherInfo) {
        const group = conversation.groupProfile;
        const attrs = await getCommodityGroupAttributes(group);
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
    gotoDetail() {
      openConversationDetail(this.properties.conversationId as string);
    },
  }
})
