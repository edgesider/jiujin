import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { EntityType, Region } from '../../types';
import { CommodityAPI } from '../../api/CommodityAPI';

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
    type: {
      type: Number,
      value: EntityType.Commodity,
    },
    selected: {
      type: Number,
      value: 0
    },
    regions: {
      type: Array,
      value: [],
      observer() {
        this.updateCounts();
      },
    },
    showCount: {
      type: Boolean,
      value: false,
    },
  },
  data: {
    ...getConstants(),
    regions: [] as Region[],
    scrollIntoView: null as string | null,
    counts: [] as number[],
  },
  lifetimes: {
    async attached() {
      // @ts-ignore
      this._subscription = new Subscription();
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
    async updateCounts() {
      if (this.properties.showCount) {
        const resp = await CommodityAPI.getCountInRegion(this.properties.regions.map(r => r._id));
        if (resp.data) {
          this.setData({
            counts: resp.data.map(c => c.count)
          });
        }
      }
    },
    onRegionClick(ev: TouchEvent) {
      const targetIdx = ev.currentTarget.dataset.idx;
      if (typeof targetIdx !== 'number') {
        return;
      }
      this.setData({
        scrollIntoView: `space-${targetIdx}`
      });
      this.triggerEvent(
        'regionClick',
        { index: targetIdx, region: this.data.regions[targetIdx] } satisfies RegionClickDetail
      );
    }
  }
});
