import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { getGlobals, updateSelfInfo, waitForAppReady } from '../../utils/globals';
import { DialogType, openDialog } from '../../utils/router';
import { UserAPI } from '../../api/UserAPI';
import { PolishCardDetail } from '../../types';
import moment from 'moment';
import { DATETIME_FORMAT } from '../../utils/time';

const app = getApp()
const PAGE_SIZE = 10;

Page({
  data: {
    ...getConstants(),
    loadError: false,
    details: [] as (PolishCardDetail & { time_str: string })[],
    sum: 0,
    page: -1,
  },
  _subscription: null as Subscription | null,
  async onLoad() {
    await waitForAppReady();
    this._subscription = new Subscription();

    await this.loadDetails();
    const self = await updateSelfInfo();
    this.setData({
      sum: self?.polish_cards ?? 0
    });
  },
  async loadDetails() {
    const { page, details } = this.data;
    const resp = await UserAPI.getPolishCardDetails(page + 1, PAGE_SIZE);
    if (resp.isError) {
      if (this.data.details.length === 0) {
        this.setData({ loadError: true });
      }
      return;
    }
    if (!resp.data) {
      return;
    }
    const newItems = resp.data.content.map(item => ({...item, time_str: moment(item.event_time).format(DATETIME_FORMAT)}));
    this.setData({
      page: page + 1,
      details: [...details, ...newItems]
    });
  },
  async loadMore() {
    await this.loadDetails();
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  },
  // openRule() {
  //   openDialog(DialogType.PolishCardRule);
  // },
})