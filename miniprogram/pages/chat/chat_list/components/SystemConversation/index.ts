import { Subscription } from 'rxjs';
import { openSystemConversationDetail } from '../../../../../utils/router';
import { ConversationItem } from '../../../../../lib/openim/index';
import { getConversationByGroup, listenConversationByGroup } from '../../../../../utils/oim';

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
      console.log('system conversation init', groupId);
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
      this.setData({ conversation, usingGroupId: groupId });
    },
    gotoDetail() {
      openSystemConversationDetail(this.data.conversation, this.properties.name);
    },
  }
})
