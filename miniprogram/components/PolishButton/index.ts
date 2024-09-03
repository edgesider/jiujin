import getConstants, {
  COMMODITY_POLISH_MIN_DURATION,
  COMMODITY_STATUS_BOOKED,
  COMMODITY_STATUS_DEACTIVATED,
  COMMODITY_STATUS_REPORTED,
  COMMODITY_STATUS_SELLING,
  COMMODITY_STATUS_SOLD,
  HELP_POLISH_MIN_DURATION,
  HELP_STATUS_FINISHED,
  HELP_STATUS_REPORTED,
  HELP_STATUS_RESOLVING,
  HELP_STATUS_RUNNING
} from '../../constants';
import { Subscription } from 'rxjs';
import { MS_IN_HOUR, MS_IN_MINUTE, MS_IN_SECOND, splitMilliseconds } from '../../utils/time';
import { getGlobals } from '../../utils/globals';
import { Commodity, Help } from '../../types';
import { openUsePolishCardDialog } from '../UsePolishCardDialog/index';
import { EntityUtils } from '../../utils/entity';
import { DialogType, openDialog } from '../../utils/router';

Component({
  properties: {
    commodity: {
      type: Object,
      observer() {
        this.onUpdate();
      }
    },
    help: {
      type: Object,
      observer() {
        this.onUpdate();
      }
    },
  },
  data: {
    ...getConstants(),
    enabled: true,
    cards: 0, // 是否有擦亮卡
    remainMs: 0, // 剩余冷却时间，<= 0时可免费擦亮
    firstPolish: false, // 是否还没有第一次擦亮，为true时一定可以免费擦亮

    tipText: '',
    isDetached: false,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.onUpdate();
      this.getSubscription().add(getApp().userChangedSubject.subscribe(() => {
        this.onUpdate();
      }));
    },
    detached() {
      this.setData({ isDetached: true });
      this.getSubscription().unsubscribe();
    }
  },
  methods: {
    getSubscription(): Subscription {
      // @ts-ignore
      return this._subscription as Subscription;
    },
    onUpdate() {
      const { commodity, help } = this.properties as any as {
        commodity?: Commodity,
        help?: Help,
      };
      if (commodity && help) {
        throw Error('both commodity and help is not null');
      }

      const { polish_cards: cards } = getGlobals().self ?? { polish_cards: 0 };

      let enabled: boolean;
      let remainMs: number;
      let tipText = '';
      let firstPolish: boolean;

      if (commodity) {
        enabled = commodity.status === COMMODITY_STATUS_SELLING;
        remainMs = (commodity.polish_time + COMMODITY_POLISH_MIN_DURATION) - Date.now();
        firstPolish = commodity.create_time === commodity.polish_time;
        if (commodity.status === COMMODITY_STATUS_BOOKED) {
          tipText = '已预定';
        } else if (commodity.status === COMMODITY_STATUS_REPORTED || commodity.status === COMMODITY_STATUS_DEACTIVATED) {
          tipText = '已下架';
        } else if (commodity.status === COMMODITY_STATUS_SOLD) {
          tipText = '已售出';
        }
      } else if (help) {
        enabled = help.status === HELP_STATUS_RUNNING;
        remainMs = (help.polish_time + HELP_POLISH_MIN_DURATION) - Date.now();
        firstPolish = help.create_time === help.polish_time;
        if (help.status === HELP_STATUS_RESOLVING) {
          tipText = '解决中';
        } else if (help.status === HELP_STATUS_REPORTED || help.status === HELP_STATUS_FINISHED) {
          tipText = '已结束';
        }
      } else {
        throw Error('both commodity and help is null');
      }
      if (!enabled) {
        tipText += '不可擦亮';
      }
      this.setData({
        enabled,
        cards,
        remainMs,
        firstPolish,
        tipText,
      });
    },
    getRemainText(ms: number) {
      const [_, sec, min, hour] = splitMilliseconds(ms);
      if (hour > 0) {
        return `${Math.ceil(ms / MS_IN_HOUR)}h`;
      } else if (min > 0) {
        return `${Math.ceil(ms / MS_IN_MINUTE)}m`;
      } else if (sec > 0) {
        return `${Math.ceil(ms / MS_IN_SECOND)}}s`;
      } else {
        return '1s';
      }
    },
    async onClick() {
      const { remainMs, enabled, cards } = this.data;
      const { commodity, help } = this.properties as any as {
        commodity?: Commodity,
        help?: Help,
      };
      if (!enabled) {
        return;
      }
      if (!EntityUtils.canFreePolish({ commodity, help })) {
        if (cards <= 0) {
          await openDialog(DialogType.NoPolishCardDialog);
          return;
        }
        const res = await openUsePolishCardDialog();
        if (!res?.ok) {
          return;
        }
      }
      this.triggerEvent('doPolish');
    },
  }
});
