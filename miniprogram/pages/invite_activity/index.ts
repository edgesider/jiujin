import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { waitForAppReady } from '../../utils/globals';
import { ActivityAPI, InvitationRankItem } from '../../api/ActivityAPI';
import { UserAPI } from '../../api/UserAPI';
import { getOpenId } from '../../api/api';
import { User } from '../../types';
import { onShareInviteActivity } from '../../utils/share';

const app = getApp()

Page({
  data: {
    ...getConstants(),
    ranks: [] as InvitationRankItem[],
    userCount: 0,
    userCountNumbers: ['0', '0', '0', '0', '0'],
    myInvitation: [] as User[],

    kiloRound: 0, // 每千人抽奖轮次
    kiloPercent: 0, // 每千人抽奖进度
    kiloPercentStr: '',
    sumPercent: 0, // 每万人结算进度
    sumPercentStr: '',
  },
  _subscription: null as Subscription | null,
  async onLoad() {
    await waitForAppReady();
    this._subscription = new Subscription();

    (async () => {
      const resp = await ActivityAPI.getUserCount();
      if (resp.isError || typeof resp.data !== 'number') {
        console.error(resp);
        return;
      }
      const count = resp.data;
      const numbers = [...count.toString().padStart(5, '0')];
      const kiloRound = Math.floor(count / 1000) + 1;
      const kiloPercent = (count % 1000) / 1000;
      const sumPercent = count / 10000;
      this.setData({
        userCount: count,
        userCountNumbers: numbers,
        kiloRound,
        kiloPercent,
        kiloPercentStr: (kiloPercent * 100).toFixed(2),
        sumPercent,
        sumPercentStr: (sumPercent * 100).toFixed(2),
      })
    })().then();

    (async () => {
      const resp = await ActivityAPI.getInvitationRank(0, 100);
      if (resp.isError) {
        console.error(resp);
        return;
      }
      this.setData({ ranks: resp.data ?? [] });
    })().then();

    (async () => {
      const resp = await UserAPI.getInvitedUsers(getOpenId());
      if (resp.isError || !resp.data) {
        console.error(resp);
        return;
      }
      this.setData({ myInvitation: resp.data });
    })().then();
  },
  onUnload() {
    this._subscription?.unsubscribe();
  },
  getSubscription() {
    return this._subscription!!;
  },
  onShareAppMessage(options) {
    return onShareInviteActivity(options);
  }
})