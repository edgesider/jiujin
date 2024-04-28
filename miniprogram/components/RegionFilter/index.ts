import getConstants, { DEFAULT_REGION_ID } from '../../constants';
import { Subscription } from 'rxjs';
import { getGlobals, waitForAppReady } from '../../utils/globals';
import { Region } from '../../types';
import { getRegionPath } from '../../utils/other';

type CustomEvent = WechatMiniprogram.CustomEvent;
type TouchEvent = WechatMiniprogram.TouchEvent;

interface RegionClickDetail {
  index: number;
  region: Region;
}

export interface RegionClickEvent {
  detail: RegionClickDetail;
}

Component({
  properties: {
    selected: {
      type: Number,
      value: 0
    }
  },
  data: {
    ...getConstants(),
    regions: [] as Region[],
    scrollIntoView: null as string | null,
  },
  lifetimes: {
    async attached() {
      // @ts-ignore
      this._subscription = new Subscription();
      await waitForAppReady();
      const { self } = getGlobals();
      const path = getRegionPath(self?.rid ?? DEFAULT_REGION_ID);
      path.reverse();
      this.setData({
        regions: path
      });
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
    onRegionClick(ev: TouchEvent) {
      const targetIdx = ev.currentTarget.dataset.idx;
      if (typeof targetIdx !== 'number') {
        return;
      }
      if (targetIdx > 0) {
        this.setData({
          scrollIntoView: `item-${targetIdx}`
        });
      }
      this.triggerEvent(
        'regionClick',
        { index: targetIdx, region: this.data.regions[targetIdx] } satisfies RegionClickDetail
      );
    }
  }
});
