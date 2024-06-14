import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { splitMilliseconds } from '../../utils/time';
import { sleep } from '../../utils/other';

Component({
  properties: {
    initialMillSeconds: {
      type: Number,
    },
    suffixText: {
      type: String,
    },
    finishedText: {
      type: String,
    },
    bgStyle: {
      type: String,
      value: 'background: var(--brand-green);'
    },
    fontSize: {
      type: String,
      value: '20rpx'
    },
    finishedBgStyle: {
      type: String,
    }
  },
  data: {
    ...getConstants(),
    text: '',
    finished: false,
    remainMs: 0,
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      this.setData({
        remainMs: this.properties.initialMillSeconds ?? 0
      });

      let detached = false;
      (async () => {
        while (!detached && this.updateCountdown() > 0) {
          await sleep(1000);
        }
      })();
      this.getSubscription().add(() => {
        detached = true;
      })
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
    updateCountdown() {
      let ms = this.data.remainMs - 1000;
      if (ms <= 0) {
        this.triggerEvent('finished');
        this.setData({ finished: true });
        ms = 0;
      }
      const [_, sec, min, hour] = splitMilliseconds(ms);
      const text = [hour, min].map(v => v.toString().padStart(2, '0')).join(':');
      this.setData({ text, remainMs: ms });
      return ms;
    },
    onClick() {
      this.triggerEvent('onClick', { remain: this.data.remainMs });
    },
  }
});
