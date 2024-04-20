import getConstants from '../../../constants';
import { getCommodityGroupAttributes, listenMessage, sendMessage } from '../../../utils/im';
import api from '../../../api/api';
import { Transaction, TransactionApi, TransactionStatus } from '../../../api/transaction';
import { Conversation, Group } from '@tencentcloud/chat';
import { Commodity, User } from '../../../types';
import { Subscription } from 'rxjs';
import { tryJsonParse } from '../../../utils/other';

type OnKeyboardHeightChangeCallbackResult = WechatMiniprogram.OnKeyboardHeightChangeCallbackResult;
type ChooseImageSuccessCallbackResult = WechatMiniprogram.ChooseImageSuccessCallbackResult;
type Input = WechatMiniprogram.Input;
type InputConfirm = WechatMiniprogram.InputConfirm;

const app = getApp();

Page({
  data: {
    ...getConstants(),
    isSeller: false,
    seller: null as User | null,
    buyer: null as User | null,
    conversationId: null as string | null,
    conversation: null as Conversation | null,
    group: null as Group | null,
    commodity: null as Commodity | null,
    transaction: null as Transaction | null,

    keyboardHeight: 0,
    input: '',
    inputFocused: false,
  },
  subscription: null as Subscription | null,
  async onLoad(options) {
    this.subscription = new Subscription();

    const { conversationId } = options;
    if (!conversationId) {
      await wx.showToast({
        title: '参数错误',
        icon: 'error',
      })
      return;
    }
    this.setData({ conversationId, });

    const kbHeightChanged = (res: OnKeyboardHeightChangeCallbackResult) => {
      this.setData({
        keyboardHeight: res.height,
      })
    };
    wx.onKeyboardHeightChange(kbHeightChanged);
    this.subscription!!.add(() => {
      wx.offKeyboardHeightChange(kbHeightChanged);
    });

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
      isSeller: sellerId === app.globalData.self._id,
      seller,
      buyer,
      conversation,
      group,
      transaction,
    });

    this.subscription!!.add(listenMessage(conversation.conversationID).subscribe(msg => {
      const custom = tryJsonParse(msg.cloudCustomData);
      if (custom?.needUpdateTransaction) {
        this.updateTransaction().then();
      }
    }));
  },
  onUnload() {
    this.subscription?.unsubscribe();
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
    let customData: string | undefined = undefined;
    if (updatePeerTransaction) {
      customData = JSON.stringify({
        needUpdateTransaction: updatePeerTransaction
      });
    }
    const msg = tim.createTextMessage({
      to: group.groupID,
      conversationType: tim.TYPES.CONV_GROUP,
      payload: { text },
      cloudCustomData: customData,
    });
    await sendMessage(msg);
  },
  async sendImageMessage(img: ChooseImageSuccessCallbackResult) {
    const { group } = this.data;
    if (!group) {
      return;
    }
    const msg = tim.createImageMessage({
      to: group.groupID,
      conversationType: tim.TYPES.CONV_GROUP,
      payload: {
        file: img
      },
    });
    await wx.showLoading({ title: '发送中' });
    try {
      await sendMessage(msg);
    } catch (e) {
      console.error(e);
      await wx.showToast({
        title: '网络错误',
      });
    } finally {
      await wx.hideLoading();
    }
  },
  async onTransactionActionDone(ev: any) {
    const messageToPeer = ev.detail.messageToPeer || '交易状态已变更';
    this.updateTransaction().then();
    this.sendTextMessage(messageToPeer, true).then();
  },
  async updateTransaction() {
    if (!this.data.transaction) {
      return;
    }
    const transaction = (await TransactionApi.getById(this.data.transaction.id)).data;
    if (!transaction) {
      return;
    }
    this.setData({ transaction, });
  },
  onInputTap() {
    this.setData({
      inputFocused: true,
    });
  },
  onInputBlur() {
    this.setData({
      inputFocused: false,
    });
  },
  onInput(ev: Input) {
    this.setData({ input: ev.detail.value });
  },
  async onInputConfirm(ev: InputConfirm) {
    const input = ev.detail.value.trim();
    this.setData({ input: '', });
    if (!input) {
      return;
    }
    await this.sendTextMessage(input);
  },
  async onSendImageIconClick() {
    const res = await wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    });
    await this.sendImageMessage(res);
  },
});