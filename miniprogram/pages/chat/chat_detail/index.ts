import getConstants from '../../../constants';
import api, { getOpenId } from '../../../api/api';
import { Transaction, TransactionApi } from '../../../api/transaction';
import { Commodity, Help, User } from '../../../types';
import { Subscription } from 'rxjs';
import { generateUUID, kbHeightChanged, tryJsonParse } from '../../../utils/other';
import { waitForAppReady } from '../../../utils/globals';
import { ConversationItem, GroupItem, PicBaseInfo, SessionType } from '../../../lib/openim/index';
import {
  checkOimResult,
  getCommodityGroupAttributes,
  getConversationById, getGroup, getHelpGroupAttributes,
  listenMessage, markConvMessageAsRead,
  sendMessage, waitForOimLogged
} from '../../../utils/oim';
import { CommodityAPI } from '../../../api/commodity';
import { HelpTransaction, HelpTransactionApi } from '../../../api/helpTransaction';

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
    conversation: null as ConversationItem | null,
    group: null as GroupItem | null,
    commodity: null as Commodity | null,
    help: null as Help | null,
    transaction: null as Transaction | HelpTransaction | null,

    keyboardHeight: 0,
    input: '',
    inputFocused: false,
  },
  subscription: null as Subscription | null,
  async onLoad(options) {
    this.subscription = new Subscription();
    await waitForAppReady();
    await waitForOimLogged();

    const { conversationId } = options;
    if (!conversationId) {
      await wx.showToast({
        title: '参数错误',
        icon: 'error',
      })
      return;
    }
    this.setData({ conversationId, });

    this.subscription!!.add(kbHeightChanged.subscribe(res => {
      this.setData({
        keyboardHeight: res.height,
      })
    }));

    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      })
      return;
    }
    const group = await getGroup(conversation.groupID);
    if (!group) {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      })
      return;
    }
    markConvMessageAsRead(conversation).then();
    let commodity: Commodity | null = null;
    let help: Help | null = null;
    let transaction: Transaction | HelpTransaction;
    let seller: User;
    let buyer: User;

    const coAttr = await getCommodityGroupAttributes(group);
    const helpAttr = await getHelpGroupAttributes(group);
    if (coAttr) {
      const { commodityId, sellerId, buyerId, transactionId } = coAttr;
      const [
        commodityResp,
        transactionResp,
        sellerResp,
        buyerResp
      ] =
        await Promise.all([
          CommodityAPI.getOne(commodityId),
          TransactionApi.getById(transactionId),
          api.getUserInfo(sellerId),
          api.getUserInfo(buyerId),
        ])
      if (commodityResp.isError || transactionResp.isError || sellerResp.isError || buyerResp.isError) {
        await wx.showToast({ title: '网络错误', icon: 'error' });
        return;
      }
      commodity = commodityResp.data!!;
      transaction = transactionResp.data!!;
      seller = sellerResp.data!!;
      buyer = buyerResp.data!!;
    } else if (helpAttr) {
      const { helpId, sellerId, buyerId, transactionId } = helpAttr;
      const [
        commodityResp,
        transactionResp,
        sellerResp,
        buyerResp
      ] =
        await Promise.all([
          api.getHelpInfo({ id: helpId }),
          HelpTransactionApi.getById(transactionId),
          api.getUserInfo(sellerId),
          api.getUserInfo(buyerId),
        ])
      if (commodityResp.isError || transactionResp.isError || sellerResp.isError || buyerResp.isError) {
        await wx.showToast({ title: '网络错误', icon: 'error' });
        return;
      }
      help = commodityResp.data!!;
      transaction = transactionResp.data!!;
      seller = sellerResp.data!!;
      buyer = buyerResp.data!!;
    } else {
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      })
      return;
    }
    this.setData({
      commodity: commodity,
      help: help,
      isSeller: seller._id === app.globalData.self._id,
      seller,
      buyer,
      conversation,
      group,
      transaction,
    });

    this.subscription!!.add(listenMessage(conversation.conversationID).subscribe(msg => {
      const custom = tryJsonParse(msg.ex);
      if (custom?.needUpdateTransaction) {
        this.updateTransaction().then();
      }
    }));
  },
  onUnload() {
    if (this.data.conversationId) {
      markConvMessageAsRead(this.data.conversationId).then();
    }
    this.subscription?.unsubscribe();
  },
  getConversationName(conversation: ConversationItem) {
    if (conversation.conversationType === SessionType.Group) {
      return conversation.showName;
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
    const msg = checkOimResult(await oim.createTextMessage(text));
    msg.groupID = group.groupID;
    msg.ex = customData || '';
    await sendMessage(msg, group.groupID, 'group');
  },
  async sendImageMessage(img: string, size: number) {
    const { group } = this.data;
    if (!group) {
      return;
    }
    const info = await wx.getImageInfo({ src: img });
    const uuid = generateUUID();
    const res = await api.uploadImage(img, `chat/${getOpenId()}/${uuid}`);
    if (res.isError) {
      await wx.showToast({ title: '图片上传失败', icon: 'error' });
      throw Error('upload file failed');
    }
    const url = res.data;
    const pic = {
      uuid: uuid,
      type: 'png',
      size,
      width: info.width,
      height: info.height,
      url,
    } satisfies PicBaseInfo;
    const msg = checkOimResult(await oim.createImageMessageByURL({
      sourcePath: url,
      sourcePicture: pic,
      bigPicture: pic,
      snapshotPicture: pic,
    }));
    msg.groupID = group.groupID;
    await wx.showLoading({ title: '发送中' });
    try {
      await sendMessage(msg, group.groupID, 'group');
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
    await this.sendImageMessage(res.tempFiles[0].path, res.tempFiles[0].size);
  },
});