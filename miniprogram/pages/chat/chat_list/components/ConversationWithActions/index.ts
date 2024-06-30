import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { ConversationItem } from '../../../../../lib/openim';

type MovableViewChange = WechatMiniprogram.MovableViewChange;
const ACTIONS_WIDTH = 80;

// 用于订阅左拉操作区展现事件，值为正在展示左拉操作区的会话ID
const actionsVisibilitySubject = new BehaviorSubject<string | null>(null);

Component({
  properties: {
    initConversation: {
      type: Object,
    },
    updateIndex: {
      type: Number,
    },
  },
  data: {
    actionsWidth: `${ACTIONS_WIDTH}px`,
    tmpMoveX: 0,
    moveX: '0',
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      const conv = this.properties.initConversation as ConversationItem;
      this.getSubscription().add(actionsVisibilitySubject.subscribe((actionsShowConvId) => {
        if (actionsShowConvId !== conv.conversationID) {
          this.setData({ moveX: '0', });
        }
      }));
    },
    detached() {
      this.getSubscription().unsubscribe();
    }
  },
  methods: {
    getSubscription(): Subscription {
      // @ts-ignore
      return this._subscription as Subscription;
    },
    onMovableChange(ev: MovableViewChange) {
      const { source, x } = ev.detail;
      if (source === 'friction' || source === 'touch') {
        this.setData({ tmpMoveX: x });
      }
    },
    onTouchEnd(ev) {
      const x = this.data.tmpMoveX;
      if (-x > ACTIONS_WIDTH / 2) {
        this.setData({ moveX: `-${ACTIONS_WIDTH}px`, });
        actionsVisibilitySubject.next(this.properties.initConversation.conversationID);
      } else {
        this.setData({ moveX: '0', });
      }
    },
    onDeleteConv() {
      this.triggerEvent('onDelete');
    },
  }
});
