import getConstants from '../../constants';
import { Subscription } from 'rxjs';

Component({
  properties: {},
  data: {
    ...getConstants(),
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
    },
    detached() {
      this.getSubscription().unsubscribe();
    },
  },
  methods: {
    getSubscription(): Subscription {
      // @ts-ignore
      return this._subscription as Subscription;
    },
    async click() {
      const img = await this.createCommodityCard();
      console.log(img);
    },
    async createCommodityCard(): Promise<any> {
      return new Promise((resolve, reject) => {
        this.createSelectorQuery().select('#commodity-share')
          .node()
          .exec(nodes => {
            nodes[0].node.takeSnapshot({
              type: 'arraybuffer',
              format: 'png',
              success: resolve,
              fail: reject,
            });
          })
      });
    }
  }
});
