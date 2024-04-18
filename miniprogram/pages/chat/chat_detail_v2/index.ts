import getConstants from '../../../constants';
import { getCommodityGroupAttributes, listenMessage } from '../../../utils/im';
import api from '../../../api/api';
import { Transaction, TransactionApi, TransactionStatus } from '../../../api/transaction';
import { getContentDesc } from '../../../utils/strings';
import { Conversation, Group } from '@tencentcloud/chat';
import { Commodity, User } from '../../../types';
import { Subscription } from 'rxjs';
import { tryJsonParse } from '../../../utils/other';

const app = getApp();

Page({
  data: {
    ...getConstants(),
    isSeller: false,
    seller: null as User | null,
    buyer: null as User | null,
    conversationName: '',
    conversationId: null as string | null,
    conversation: null as Conversation | null,
    group: null as Group | null,
    commodity: null as Commodity | null,
    commodityDesc: '',
    transaction: null as Transaction | null,
    statusImage: null as string | null,
    tip: '',
  },
  subscription: null as Subscription | null,
  async onLoad(options) {
    const { conversationId } = options;
    if (!conversationId) {
      await wx.showToast({
        title: '参数错误',
        icon: 'error',
      })
      return;
    }
    this.setData({ conversationId, });

    const { conversation } = (await tim.getConversationProfile(conversationId)).data;
    tim.setMessageRead({ conversationID: conversation.conversationID }).then();
    const group = conversation.groupProfile;
    const attrs = await getCommodityGroupAttributes(group.groupID);
    if (!attrs) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      })
      return;
    }
    const { commodityId, sellerId, buyerId, transactionId } = attrs;
    const [
      commodityResp,
      transactionResp,
      sellerResp,
      buyerResp
    ] =
      await Promise.all([
        api.getCommodityInfo({ id: commodityId }),
        TransactionApi.getById(transactionId),
        api.getUserInfo(sellerId),
        api.getUserInfo(buyerId),
      ])
    if (commodityResp.isError || transactionResp.isError || sellerResp.isError || buyerResp.isError) {
      await wx.showToast({ title: '网络错误', icon: 'error' });
      return;
    }
    const commodity = commodityResp.data!!;
    const transaction = transactionResp.data!!;
    const seller = sellerResp.data!!;
    const buyer = buyerResp.data!!;
    this.setData({
      commodity: commodity,
      commodityDesc: getContentDesc(commodity.content, 40),
      isSeller: sellerId === app.globalData.self._id,
      conversationName: this.getConversationName(conversation),
      seller,
      buyer,
      conversation,
      group,
      transaction,
    });

    this.subscription = listenMessage(conversation.conversationID).subscribe(msg => {
      const custom = tryJsonParse(msg.cloudCustomData);
      if (custom?.needUpdateTransaction) {
        this.updateTransaction().then();
      }
    })
  },
  getConversationName(conversation: Conversation) {
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
  async sendTextMessage(text: string, updatePeerTransaction: boolean = false) {
    const { group } = this.data;
    if (!group) {
      return;
    }
    const msg = tim.createTextMessage({
      to: group.groupID,
      conversationType: tim.TYPES.CONV_GROUP,
      payload: { text },
      cloudCustomData: JSON.stringify({
        needUpdateTransaction: updatePeerTransaction
      })
    });
    await tim.sendMessage(msg);
  },
  async onTransactionActionDone({ messageToPeer }: { messageToPeer: string }) {
    console.log('messageToPeer', messageToPeer);
    this.updateTransaction().then();
    this.sendTextMessage(messageToPeer, true).then();
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
    this.setData({ transaction, });
  },
});