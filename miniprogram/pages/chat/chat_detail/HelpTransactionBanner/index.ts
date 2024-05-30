import getConstants from '../../../../constants';
import { getContentDesc } from '../../../../utils/strings';
import { HelpTransaction, HelpTransactionAPI, HelpTransactionStatus } from '../../../../api/HelpTransactionAPI';
import { NotifyType, requestNotifySubscribe } from '../../../../utils/notify';
import { sleep, toastError } from '../../../../utils/other';
import { Help } from '../../../../types';
import { openHelpDetail } from '../../../../utils/router';

const app = getApp();

Component({
  properties: {
    transaction: {
      type: Object,
      observer() {
        this.update();
      }
    },
    help: {
      type: Object,
      observer() {
        this.update();
      }
    },
  },
  data: {
    ...getConstants(),
    isSeller: false,
    helpDesc: '',
    statusImage: null as string | null,
    tips: [] as string[],
  },
  lifetimes: {
    attached() {
    }
  },
  methods: {
    async update() {
      const help = this.properties.help as Help;
      const transaction = this.properties.transaction as HelpTransaction;
      this.setData({
        isSeller: help.seller_id === app.globalData.self._id,
        helpDesc: getContentDesc(help.content, 40),
        tips: this.getTransactionStatusTip(transaction),
        statusImage: this.getTransactionStatusImage(transaction),
      })
    },
    afterTransactionActionDone(messageToPeer: string) {
      this.triggerEvent('onTransactionActionDone', {
        messageToPeer: messageToPeer,
      });
    },
    gotoHelpDetail() {
      openHelpDetail({ id: this.properties.help._id });
    },
    async agreeBooking() {
      const { confirm } = await wx.showModal({
        content: '该用户向你申请提供帮助，同意后求助信息依然可见，但其他人暂不可申请提供帮助，是否同意？',
        confirmText: '同意',
        cancelText: '取消',
        showCancel: true,
      });
      if (!confirm) {
        return;
      }
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const resp = await HelpTransactionAPI.agreeBooking(transaction.id);
      if (resp.isError) {
        toastError(resp.message ?? '操作失败，请稍后再试');
        return;
      }
      this.afterTransactionActionDone('我已同意你的帮助申请');
      wx.showToast({ title: '已同意', }).then();
    },
    async denyBooking() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const reasons = [
        '问题已解决',
        '其他',
      ];
      const { tapIndex } = await wx.showActionSheet({ itemList: reasons });
      const reason = reasons[tapIndex];
      const resp = await HelpTransactionAPI.denyBooking(transaction.id, reason);
      if (resp.isError) {
        toastError(resp.message ?? '操作失败，请稍后再试');
        return;
      }
      this.afterTransactionActionDone(`抱歉，因“${reason}”，我拒绝了你的帮助申请`);
      wx.showToast({ title: '已拒绝' }).then();
    },
    async requestBooking() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const { confirm } = await wx.showModal({
        content: '确定向对方申请提供帮助？',
        confirmText: '确定',
        cancelText: '取消',
        showCancel: true,
      });
      if (!confirm) {
        return;
      }
      const resp = await HelpTransactionAPI.requestBooking(transaction.id);
      if (resp.isError) {
        toastError(resp.message ?? '操作失败，请稍后再试');
        return;
      }
      this.afterTransactionActionDone('我已申请提供帮助');
      wx.showToast({ title: '已申请' }).then();
      await sleep(200);
      requestNotifySubscribe([NotifyType.HelpChat]).then()
    },
    async cancelBooking() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const { confirm } = await wx.showModal({
        content: '确定取消申请？',
        confirmText: '确定',
        cancelText: '取消',
        showCancel: true,
      });
      if (!confirm) {
        return;
      }
      const resp = await HelpTransactionAPI.cancelBooking(transaction.id);
      if (resp.isError) {
        toastError(resp.message ?? '操作失败，请稍后再试');
        return;
      }
      this.afterTransactionActionDone('我已取消提供帮助的申请');
      wx.showToast({ title: '已取消', }).then();
    },
    async confirmSold() {
      const { confirm } = await wx.showModal({
        content: '点击确认，该求助将被标注为“已解决”状态，其他人不可申请提供帮助',
        confirmText: '确认',
        cancelText: '取消',
        showCancel: true,
      });
      if (!confirm) {
        return;
      }
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const resp = await HelpTransactionAPI.confirmSold(transaction.id);
      if (resp.isError) {
        toastError(resp.message ?? '操作失败，请稍后再试');
        return;
      }
      this.afterTransactionActionDone('我已确认求助得到解决');
      wx.showToast({ title: '已确认解决', }).then();
    },
    async confirmTerminated() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const reasons = [
        '已解决',
        '其他'
      ];
      const { tapIndex } = await wx.showActionSheet({
        itemList: reasons
      });
      const reason = reasons[tapIndex];
      const resp = await HelpTransactionAPI.confirmTerminated(transaction.id, reason);
      if (resp.isError) {
        toastError(resp.message ?? '操作失败，请稍后再试');
        return;
      }
      this.afterTransactionActionDone(`因“${reason}”，我已终止求助`);
      wx.showToast({ title: '已终止', }).then();
    },
    getTransactionStatusImage(transaction: HelpTransaction) {
      return ({
        [HelpTransactionStatus.RequestingBooking]: '/images/待确认.png',
        [HelpTransactionStatus.Denied]: '/images/已拒绝.png',
        [HelpTransactionStatus.Booked]: '/images/解决中.png',
        [HelpTransactionStatus.Finished]: '/images/已解决.png',
      })[transaction.status] ?? null;
    },
    getTransactionStatusTip(transaction: HelpTransaction): string[] {
      let tips;
      let remain = '';
      if (transaction.book_time) {
        const remainMin = (transaction.book_time + 1000 * 60 * 60 * 12 - Date.now()) / 1000 / 60;
        const min = Math.floor(remainMin % 60).toFixed().padStart(2, '0');
        const hour = Math.floor(remainMin / 60).toFixed().padStart(2, '0');
        remain = `${hour}:${min}`
      }
      if (this.data.isSeller) {
        tips = ({
          [HelpTransactionStatus.Booked]: [
            '点击“已解决”，求助将终止；点击“未解决”，求助将继续悬赏',
            `如12小时内无任何操作，会自动转为“已售出”状态 | <span style="color: var(--brand-green)">剩余${remain}</span>`,
          ],
        })[transaction.status];
      } else {
        tips = ({
          [HelpTransactionStatus.Idle]: [
            '和悬赏人沟通好需求细节后，点击“我要帮忙”锁定赏金'
          ],
          [HelpTransactionStatus.Booked]: [
            `如12小时内无任何操作，会自动转为“已售出”状态 | <span style="color: var(--brand-green)">剩余${remain}</span>`,
          ]
        })[transaction.status];
      }
      return tips ?? [];
    }
  }
});
