// TUIKit-WChat/Chat/index.ts
import constant from '../../utils/constant';
import api from "../../../../api/api";
import getConstants from "../../../../constants";
import { TransactionApi, TransactionStatus } from "../../../../api/transaction";
import { getContentDesc } from "../../../../utils/strings";
import { getCommodityGroupAttributes } from "../../../../utils/im";

const app = getApp();

const inputStyle = `
  --padding: 0px
`;

let newInputStyle = `
--padding: 0px
`;

const setNewInputStyle = (number) => {
  newInputStyle = `--padding: ${number}px`;
};

Component({
  properties: {
    currentConversationID: {
      type: String,
      observer(newId, oldId) {
        if (!oldId && newId) {
          this.setData({
            conversationID: newId,
          }, () => {
            this.init();
          });
        }
      },
    },
    unreadCount: {
      type: Number,
      observer(unreadCount) {
        this.setData({
          unreadCount,
        });
      },
    },
  },

  lifetimes: {
    attached() {
    },
    detached() {
      tim.off(tim.EVENT.MESSAGE_RECEIVED, this.onNewMessage);
    },
    ready() {
      const query = wx.createSelectorQuery().in(this);
      query.select('.message-list').boundingClientRect((rect) => {
        this.setData({
          chatContainerHeight: rect.height
        })
      }).exec();
    },
  },
  data: {
    ...getConstants(),
    isSeller: false,
    conversationName: '',
    conversation: null,
    group: null,
    commodity: null,
    commodityDesc: '',
    transaction: null,
    statusImage: null,
    tip: '',
    conversationID: '',
    unreadCount: 0,
    viewData: {
      style: inputStyle,
    },
    chatContainerHeight: 0,
  },

  methods: {
    async init() {
      const { conversation } = (await tim.getConversationProfile(this.data.conversationID)).data;
      tim.setMessageRead({ conversationID: conversation.conversationID }).then();
      const group = conversation.groupProfile;
      const { commodityId, sellerId, transactionId } = await getCommodityGroupAttributes(group.groupID) ?? {};
      const [commodityResp, transactionResp, sellerResp] =
        await Promise.all([
          api.getCommodityInfo({ id: commodityId }),
          TransactionApi.getById(transactionId),
          api.getUserInfo(sellerId),
        ])
      if (commodityResp.isError || transactionResp.isError || sellerResp.isError) {
        await wx.showToast({ title: '网络错误', icon: 'error' });
        return;
      }
      const commodity = commodityResp.data;
      const transaction = transactionResp.data;
      const seller = sellerResp.data;
      this.setData({
        commodity: commodity,
        commodityDesc: getContentDesc(commodity.content),
        isSeller: sellerId === app.globalData.self._id,
        conversationName: this.getConversationName(conversation),
        seller,
        conversation,
        group,
        transaction,
      });
      this.setData({
        statusImage: this.getTransactionStatusImage(transaction),
        tip: this.getTransactionStatusTip(transaction),
      });

      const onNewMessage = (newData) => {
        const msgList = newData.data;
        let needUpdateTransaction = false;
        msgList
          .filter(msg => msg.conversationID === conversation.conversationID)
          .forEach(msg => {
            const custom = JSON.parse(msg.cloudCustomData ?? '{}');
            if (custom?.needUpdateTransaction) {
              needUpdateTransaction = true;
            }
          });
        if (needUpdateTransaction) {
          this.updateTransaction().then();
        }
      }
      this.onNewMessage = onNewMessage;
      tim.on(tim.EVENT.MESSAGE_RECEIVED, onNewMessage);
    },
    onNewMessage: null,
    getConversationName(conversation) {
      if (conversation.type === '@TIM#SYSTEM') {
        this.setData({
          showChat: false,
        });
        return '系统通知';
      }
      if (conversation.type === tim.TYPES.CONV_C2C) {
        return conversation.remark || conversation.userProfile.nick || conversation.userProfile.userID;
      }
      if (conversation.type === tim.TYPES.CONV_GROUP) {
        return conversation.groupProfile.name || conversation.groupProfile.groupID;
      }
    },
    onSendMessage(event) {
      // 将自己发送的消息写进消息列表里面
      this.selectComponent('#MessageList').updateMessageList(event.detail.message);
    },
    gotoCommodityDetail() {
      wx.navigateTo({
        url: `/pages/commodity_detail/index?id=${this.data.commodity._id}`,
      })
    },
    showMessageErrorImage(event) {
      this.selectComponent('#MessageList').sendMessageError(event);
    },
    triggerClose() {
      this.selectComponent('#MessageInput').handleClose();
    },
    handleCall(event) {
      if (event.detail.conversationType === tim.TYPES.CONV_GROUP) {
        this.selectComponent('#TUIGroup').callShowMoreMember(event);
      } else {
        this.triggerEvent('handleCall', event.detail);
      }
    },
    async goBack() {
      await wx.navigateBack();
      await tim.setMessageRead({
        conversationID: this.data.conversationID,
      });
    },
    resendMessage(event) {
      this.selectComponent('#MessageInput').onInputValueChange(event);
    },
    // 监听键盘，获取焦点时将输入框推到键盘上方
    pullKeysBoards(event) {
      setNewInputStyle(event.detail.event.detail.height);
      this.setData({
        'viewData.style': newInputStyle,
      }, () => {
        this.selectComponent('#MessageList').updateScrollToBottom();
      });
    },
    // 监听键盘，失去焦点时收起键盘
    downKeysBoards(event) {
      this.setData({
        'viewData.style': inputStyle,
      });
    },
    inputHeightChange() {
      this.selectComponent('#MessageList').updateScrollToBottom();
    },
    typing(event) {
      const { STRING_TEXT, FEAT_NATIVE_CODE } = constant;
      if (this.data.conversation.type === tim.TYPES.CONV_C2C) {
        if (event.detail.typingMessage.typingStatus === FEAT_NATIVE_CODE.ISTYPING_STATUS && event.detail.typingMessage.actionParam === constant.TYPE_INPUT_STATUS_ING) {
          this.setData({
            conversationName: STRING_TEXT.TYPETYPING,
          });
          setTimeout(() => {
            this.setData({
              conversationName: this.getConversationName(this.data.conversation),
            });
          }, (1000 * 30));
        } else if (event.detail.typingMessage.typingStatus === FEAT_NATIVE_CODE.NOTTYPING_STATUS && event.detail.typingMessage.actionParam === constant.TYPE_INPUT_STATUS_END) {
          this.setData({
            conversationName: this.getConversationName(this.data.conversation),
          });
        }
      }
    },
    async sendTextMessage(text) {
      const { group } = this.data;
      if (!group) {
        return;
      }
      const msg = tim.createTextMessage({
        to: this.data.group.groupID,
        conversationType: tim.TYPES.CONV_GROUP,
        payload: { text },
        cloudCustomData: JSON.stringify({
          needUpdateTransaction: true
        })
      });
      await tim.sendMessage(msg);
      this.selectComponent('#MessageList').updateMessageList(msg);
    },
    async updateTransaction() {
      if (!this.data.transaction) {
        return;
      }
      console.log('updating transaction');
      const transaction = (await TransactionApi.getById(this.data.transaction.id)).data;
      if (!transaction) {
        return;
      }
      this.setData({
        transaction,
        statusImage: this.getTransactionStatusImage(transaction),
        tip: this.getTransactionStatusTip(transaction),
      });
    },
    async agreeBooking() {
      const { transaction } = this.data;
      const resp = await TransactionApi.agreeBooking(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      await this.updateTransaction();
      this.sendTextMessage('我已同意你的预定').then();
      wx.showToast({ title: '已同意', }).then();
    },
    async denyBooking() {
      const { transaction } = this.data;
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
      await this.updateTransaction();
      this.sendTextMessage(`因“${reason}”，我已拒绝你的预定`).then();
      wx.showToast({ title: '已拒绝' }).then();
    },
    async requestBooking() {
      const { transaction } = this.data;
      const resp = await TransactionApi.requestBooking(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      await this.updateTransaction();
      this.sendTextMessage('我已发出预约申请').then();
      wx.showToast({ title: '已申请预约' }).then();
    },
    async cancelBooking() {
      const { transaction } = this.data;
      const resp = await TransactionApi.cancelBooking(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      await this.updateTransaction();
      this.sendTextMessage('我已取消预约申请').then();
      wx.showToast({ title: '已取消预约', }).then();
    },
    async confirmSold() {
      const { transaction } = this.data;
      const resp = await TransactionApi.confirmSold(transaction.id);
      if (resp.isError) {
        await wx.showToast({
          title: '操作失败，请稍后再试',
          icon: 'error'
        })
        return;
      }
      await this.updateTransaction();
      this.sendTextMessage('我已确认售出').then();
      wx.showToast({ title: '已确认售出', }).then();
    },
    async confirmTerminated() {
      const { transaction } = this.data;
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
      await this.updateTransaction();
      this.sendTextMessage('我已确认终止').then();
      wx.showToast({ title: '已确认终止', }).then();
    },
    getTransactionStatusImage(transaction) {
      return ({
        [TransactionStatus.RequestingBooking]: '/images/待确认.png',
        [TransactionStatus.Denied]: '/images/已拒绝.png',
        [TransactionStatus.Booked]: '/images/已预定.png',
        [TransactionStatus.Finished]: '/images/已成交.png',
      })[transaction.status];
    },
    getTransactionStatusTip(transaction) {
      if (this.data.isSeller) {
        return ({
          [TransactionStatus.Booked]: '点击“已售出”商品正式下架，点击“未售出”后商品擦亮置顶',
        })[transaction.status];
      } else {
        return ({
          [TransactionStatus.Idle]: '和卖方确定购买意向后，点击“预订”，对方将暂时为你预留商品',
        })[transaction.status];
      }
    }
  },
});
