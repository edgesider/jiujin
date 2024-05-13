import getConstants from '../../../../constants';
import { getContentDesc } from '../../../../utils/strings';
import { Transaction, TransactionApi, TransactionStatus } from '../../../../api/transaction';
import { NotifyType, requestNotifySubscribe } from '../../../../utils/notify';
import { sleep } from '../../../../utils/other';
import { Help } from '../../../../types';
import { openHelpDetail, openHelpEdit } from '../../../../utils/router';

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
      const transaction = this.properties.transaction as Transaction;
      this.setData({
        isSeller: help.uid === app.globalData.self._id,
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
        content: '该用户向你申请预订商品，预定期间商品暂时下架',
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
      const resp = await TransactionApi.agreeBooking(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone('我已同意你的预定');
      wx.showToast({ title: '已同意', }).then();
    },
    async denyBooking() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const reasons = [
        '已通过其他方式出售',
        '交易距离远',
        '不想卖了',
      ];
      const { tapIndex } = await wx.showActionSheet({ itemList: reasons });
      const reason = reasons[tapIndex];
      const resp = await TransactionApi.denyBooking(transaction.id, reason);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone(`抱歉，因“${reason}”，我拒绝了你的预定`);
      wx.showToast({ title: '已拒绝' }).then();
    },
    async requestBooking() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const resp = await TransactionApi.requestBooking(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone('我已发出预约申请');
      wx.showToast({ title: '已申请预约' }).then();
      await sleep(200);
      requestNotifySubscribe([NotifyType.BookingAgreed]).then()
    },
    async cancelBooking() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const resp = await TransactionApi.cancelBooking(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone('我已取消预约申请');
      wx.showToast({ title: '已取消预约', }).then();
    },
    async confirmSold() {
      const { confirm } = await wx.showModal({
        content: '点击确认，该商品将被标注为“已售出”状态，其他人不可购买。',
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
      const resp = await TransactionApi.confirmSold(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone('我已确认售出');
      wx.showToast({ title: '已确认售出', }).then();
    },
    async confirmTerminated() {
      const { transaction } = this.data;
      if (!transaction) {
        return;
      }
      const reasons = [
        '已通过其他方式出售',
        '交易距离远',
        '买家不想买了',
        '不想卖了',
      ];
      const { tapIndex } = await wx.showActionSheet({
        itemList: reasons
      });
      const reason = reasons[tapIndex];
      const resp = await TransactionApi.confirmTerminated(transaction.id, reason);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone(`因“${reason}”，我已确认终止交易`);
      wx.showToast({ title: '已终止', }).then();
    },
    getTransactionStatusImage(transaction: Transaction) {
      return ({
        [TransactionStatus.RequestingBooking]: '/images/待确认.png',
        [TransactionStatus.Denied]: '/images/已拒绝.png',
        [TransactionStatus.Booked]: '/images/已预定.png',
        [TransactionStatus.Finished]: '/images/已成交.png',
      })[transaction.status] ?? null;
    },
    getTransactionStatusTip(transaction: Transaction): string[] {
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
          [TransactionStatus.Booked]: [
            '点击“已售出”商品正式下架，点击“未售出”后商品擦亮置顶',
            `如12小时内无任何操作，会自动转为“已售出”状态 | <span style="color: var(--brand-green)">剩余${remain}</span>`,
          ],
        })[transaction.status];
      } else {
        tips = ({
          [TransactionStatus.Idle]: [
            '和卖方确定购买意向后，点击“预订”，对方将暂时为你预留商品',
          ],
          [TransactionStatus.Booked]: [
            `如12小时内无任何操作，会自动转为“已售出”状态 | <span style="color: var(--brand-green)">剩余${remain}</span>`,
          ]
        })[transaction.status];
      }
      return tips ?? [];
    }
  }
});
