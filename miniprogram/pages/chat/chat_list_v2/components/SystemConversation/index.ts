import { Conversation } from '@tencentcloud/chat';
import {
  getConversationByGroup,
  listenConversationByGroup,
} from '../../../../../utils/im';
import { Subscription } from 'rxjs';
import { openSystemConversationDetail } from '../../../../../utils/router';

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
  },
  data: {
    usingGroupId: null as string | null,
    conversation: null as Conversation | null,
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
      console.log('system conversation init');
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
    async onConversationUpdate(conversation: Conversation) {
      const groupId = conversation!.groupProfile.groupID;
      console.log(`system conversation ${this.properties.name}(gid=${groupId}) updated`);
      this.setData({ conversation, usingGroupId: groupId });
    },
    gotoDetail() {
      openSystemConversationDetail(this.data.conversation, this.properties.name);
    },
  }
})
