import getConstants from '../../../../constants';
import { Commodity } from '../../../../types';
import { getContentDesc } from '../../../../utils/strings';
import { Transaction, TransactionApi, TransactionStatus } from '../../../../api/transaction';
import { openCommodityDetail } from '../../../../utils/router';

const app = getApp();

Component({
  properties: {
    transaction: {
      type: Object,
      observer() {
        this.update();
      }
    },
    commodity: {
      type: Object,
      observer() {
        this.update();
      }
    },
  },
  data: {
    ...getConstants(),
    isSeller: false,
    commodityDesc: '',
    statusImage: '',
    tip: '',
  },
  lifetimes: {
    attached() {
    }
  },
  methods: {
    async update() {
      const commodity = this.properties.commodity as Commodity;
      this.setData({
        isSeller: commodity.seller_id === app.globalData.self._id,
        commodityDesc: getContentDesc(commodity.content, 40),
      })
    },
    afterTransactionActionDone(messageToPeer: string) {
      this.triggerEvent('onTransactionActionDone', {
        messageToPeer: messageToPeer,
      });
    },
    gotoCommodityDetail() {
      openCommodityDetail({ id: this.properties.commodity._id });
    },
    async agreeBooking() {
      const { confirm } = await wx.showModal({
        content: '该用户想你申请预订商品，预定期间商品暂时下架，其他人不可见，是否同意？',
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
      const { confirm } = await wx.showModal({
        content: '确认拒绝？',
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
      const reasons = ['商品已售出', '交易距离远', '不想卖了', '其他'];
      const { tapIndex } = await wx.showActionSheet({
        itemList: reasons
      });
      const reason = reasons[tapIndex];
      const resp = await TransactionApi.denyBooking(transaction.id, reason);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      this.afterTransactionActionDone(`因“${reason}”，我已拒绝你的预定`);
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
        content: '售出后该商品可参与抽奖……确认已售出？',
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
      const { confirm } = await wx.showModal({
        content: '确认终止？',
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
      const reasons = ['商品已售出', '交易距离远', '不想卖了', '其他'];
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
      this.afterTransactionActionDone('我已确认终止');
      wx.showToast({ title: '已确认终止', }).then();
    },
    getTransactionStatusImage(transaction: Transaction) {
      return ({
        [TransactionStatus.RequestingBooking]: '/images/待确认.png',
        [TransactionStatus.Denied]: '/images/已拒绝.png',
        [TransactionStatus.Booked]: '/images/已预定.png',
        [TransactionStatus.Finished]: '/images/已成交.png',
      })[transaction.status] ?? null;
    },
    getTransactionStatusTip(transaction: Transaction) {
      let tip;
      if (this.data.isSeller) {
        tip = ({
          [TransactionStatus.Booked]: '点击“已售出”商品正式下架，点击“未售出”后商品擦亮置顶',
        })[transaction.status];
      } else {
        tip = ({
          [TransactionStatus.Idle]: '和卖方确定购买意向后，点击“预订”，对方将暂时为你预留商品',
        })[transaction.status];
      }
      return tip ?? null;
    }
  }
});
