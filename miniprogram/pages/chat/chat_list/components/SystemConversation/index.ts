import { Subscription } from 'rxjs';
import { openSystemConversationDetail } from '../../../../../utils/router';
import { ConversationItem, MessageItem } from '../../../../../lib/openim/index';
import { getConversationByGroup, listenConversationByGroup } from '../../../../../utils/oim';
import moment from 'moment';
import { DATETIME_FORMAT } from '../../../../../utils/time';
import { tryJsonParse } from '../../../../../utils/other';
import { NotifyPayload } from '../../../system_chat_detail';

Component({
  properties: {
    groupId: {
      type: String,
      observer(newVal) {
        if (newVal && !this.data.usingGroupId) {
          this.init(newVal);
        }
      }
    },
    icon: {
      type: String
    },
    name: {
      type: String,
    },
    style: {
      type: String,
      value: 'icon' // icon | list
    }
  },
  data: {
    usingGroupId: null as string | null,
    conversation: null as ConversationItem | null,
    lastMessageText: '',
    lastTime: '',
  },
  lifetimes: {
    detached() {
      // @ts-ignore
      (this.subscription as Subscription | undefined)
        ?.unsubscribe();
    }
  },
  methods: {
    async init(groupId: string) {
      const conversation = await getConversationByGroup(groupId);
      if (conversation) {
        await this.onConversationUpdate(conversation);
      }
      // @ts-ignore
      this.subscription =
        listenConversationByGroup(groupId).subscribe(conv => {
          this.onConversationUpdate(conv);
        });
    },
    async onConversationUpdate(conversation: ConversationItem) {
      const groupId = conversation.groupID;
      const lastMessage = tryJsonParse<MessageItem>(conversation.latestMsg);
      let lastMessageText = '';
      if (lastMessage?.textElem) {
        const payload = tryJsonParse<NotifyPayload>(lastMessage.textElem.content);
        if (payload) {
          if (payload.type === 'simple') {
            lastMessageText = payload.title;
          }
        }
      }
      this.setData({
        conversation,
        usingGroupId: groupId,
        lastMessageText,
        lastTime: lastMessage ? moment(lastMessage.sendTime).format(DATETIME_FORMAT) : '',
      });
    },
    gotoDetail() {
      openSystemConversationDetail(this.data.conversation, this.properties.name);
    },
  }
})
