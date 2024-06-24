import moment from 'moment';
import api, { getOpenId } from '../../../../../api/api';
import { Resp } from '../../../../../api/resp';
import { User } from '../../../../../types';
import { openConversationDetail } from '../../../../../utils/router';
import { Subscription } from 'rxjs';
import { DATETIME_FORMAT } from '../../../../../utils/time';
import { NotifyType, requestNotifySubscribes } from '../../../../../utils/notify';
import {
  getCommodityGroupAttributes,
  getGroup,
  getHelpGroupAttributes,
  isOthersNewCreateConversation,
  listenConversation,
} from '../../../../../utils/oim';
import { ConversationItem, MessageItem, MessageType } from '../../../../../lib/openim/index';
import getConstants from '../../../../../constants';

Component({
  properties: {
    conversation: {
      type: Object,
      // 不支持更新
      // observer(newVal, oldVal)
    },
    updateIndex: {
      type: Number,
      observer(newVal, oldVal) {
        if (this.data.canView) {
          this.updateOtherInfo();
        }
      }
    },
  },
  data: {
    conversation: null as ConversationItem | null,
    lastMessageText: '',
    lastTime: '',
    /** 对方用户的信息 */
    peerUser: null as User | null,
    /** 内容的简述 */
    desc: '',
    canView: false,
  },
  lifetimes: {
    async attached() {
      const { conversation } = this.properties;
      // @ts-ignore
      this.subscription =
        listenConversation(conversation.conversationID).subscribe(conv => {
          this.onConversationUpdate(conv);
        });
      this.onConversationUpdate(conversation).then();
      this.createIntersectionObserver({ thresholds: [0.5] })
        .relativeToViewport()
        .observe('#root', res => {
          const canView = res.intersectionRatio > 0.5;
          if (canView !== this.data.canView) {
            this.setData({ canView });
            if (canView && !this.data.peerUser) {
              this.updateOtherInfo().then()
            }
          }
        })
    },
    detached() {
      // @ts-ignore
      (this.subscription as Subscription | undefined)
        ?.unsubscribe();
    }
  },
  methods: {
    async onConversationUpdate(conversation: ConversationItem) {
      if (isOthersNewCreateConversation(conversation)) {
        return;
      }
      const { latestMsg } = conversation;
      const lastMessage = JSON.parse(latestMsg) as MessageItem;
      let lastMessageText = '';
      if (!lastMessage) {
        lastMessageText = ''
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
    },
    async updateOtherInfo() {
      const { conversation } = this.data;
      const group = await getGroup(conversation.groupID);
      if (!group) {
        throw Error(`failed to get group: groupId=${conversation.groupID}`)
      }
      const attrs = (await getCommodityGroupAttributes(group)) || (await getHelpGroupAttributes(group));
      if (!attrs) {
        console.error(`not commodity/help conversation ${group.groupID} ${group.ownerUserID}`);
        return;
      }
      if (attrs.desc) {
        this.setData({ desc: attrs.desc });
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
    },
    async gotoDetail() {
      if (getConstants().Platform !== 'devtools') {
        requestNotifySubscribes([NotifyType.CommodityChat, NotifyType.HelpChat]).then()
      }
      await openConversationDetail(this.data.conversation.conversationID as string);
    },
  }
})
