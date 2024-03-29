import moment from 'moment';
import { Conversation } from '@tencentcloud/chat';
import {
  getCommodityGroupAttributes,
  getConversationById, listenConversation,
  listenMessageForConversation
} from '../../../../../utils/im';
import api from '../../../../../api/api';
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
    lastTime: '',
    seller: null as User | null,
  },
  lifetimes: {
    created() {
    },
    async attached() {
      const conversation = getConversationById(this.properties.conversationId);
      if (!conversation) {
        console.error(`invalid conversationId ${this.properties.conversationId}`);
        return;
      }
      this.onConversationUpdate(conversation);
      // @ts-ignore
      this.subscription =
        listenConversation(this.properties.conversationId).subscribe(conv => {
          this.onConversationUpdate(conversation);
        });
    },
    detached() {
      // @ts-ignore
      (this.subscription as Subscription | undefined)
        ?.unsubscribe();
    }
  },
  methods: {
    async onConversationUpdate(conversation: Conversation) {
      conversation = (await tim.getConversationProfile(conversation.conversationID)).data.conversation as Conversation;
      this.setData({
        conversation,
        lastTime: moment(conversation.lastMessage.lastTime * 1000).format('YYYY-MM-DD HH:mm'),
      });

      const group = conversation.groupProfile;
      const attrs = await getCommodityGroupAttributes(group.groupID);
      if (!attrs) {
        console.error('not commodity conversation');
        return;
      }
      const seller: Resp<User> = await api.getUserInfo(attrs.sellerId);
      if (seller.isError) {
        console.error(`failed to get user info for ${attrs.sellerId}`);
      } else {
        this.setData({
          seller: seller.data
        })
      }
    },
    gotoDetail() {
      openConversationDetail(this.properties.conversationId as string);
    },
  }
})
