import getConstants from '../../../constants';
import api, { getOpenId } from '../../../api/api';
import { Transaction, TransactionAPI } from '../../../api/TransactionAPI';
import { Commodity, Help, User } from '../../../types';
import { Subscription } from 'rxjs';
import { generateUUID, kbHeightChanged, toastError, tryJsonParse } from '../../../utils/other';
import { waitForAppReady } from '../../../utils/globals';
import { ConversationItem, GroupItem, GroupMemberItem, PicBaseInfo, SessionType } from '../../../lib/openim/index';
import {
  checkOimResult,
  getCommodityGroupAttributes,
  getConversationById,
  getGroup,
  getHelpGroupAttributes, getImUidFromUid, getMemberList,
  listenMessage,
  markConvMessageAsRead,
  sendMessage,
  waitForOimLogged
} from '../../../utils/oim';
import { CommodityAPI } from '../../../api/CommodityAPI';
import { HelpTransaction, HelpTransactionAPI } from '../../../api/HelpTransactionAPI';
import { HelpAPI } from '../../../api/HelpAPI';
import { NotifyType, requestNotifySubscribes } from '../../../utils/notify';
import { metric } from '../../../utils/metric';
import { decodeOptions } from '../../../utils/strings';
import { compressImage } from '../../../utils/canvas';

type Input = WechatMiniprogram.Input;

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
    commodityTact: null as Transaction | null,
    helpTact: null as HelpTransaction | null,
    members: [] as GroupMemberItem[],

    keyboardHeight: 0,
    inputting: false,
    input: '',
    inputFocused: false,
  },
  subscription: null as Subscription | null,
  async onLoad(options) {
    this.subscription = new Subscription();
    await waitForAppReady();
    await waitForOimLogged();

    options = decodeOptions(options);
    const { conversationId } = options;
    if (!conversationId) {
      await wx.showToast({
        title: '参数错误',
        icon: 'error',
      })
      return;
    }
    this.subscription!!.add(kbHeightChanged.subscribe(res => {
      this.setData({
        keyboardHeight: res.height,
      })
    }));
    this.subscription!!.add(listenMessage(conversationId).subscribe(msg => {
      const custom = tryJsonParse(msg.ex);
      if (custom?.needUpdateTransaction) {
        this.updateTransaction().then();
      }
    }));

    this.setData({ conversationId, });
    try {
      await this.loadData();
    } catch (e) {
      metric.write('im_load_failed', {}, {
        error: JSON.stringify(e),
        conversationId
      });
    }
    metric.write('im_load_succeed');
  },
  onUnload() {
    const conv = this.data.conversation;
    if (conv && conv.unreadCount > 0) {
      markConvMessageAsRead(conv).then();
    }
    this.subscription?.unsubscribe();
  },
  async loadData() {
    if (!this.data.conversationId) {
      return;
    }
    console.log(this.route, this.data.conversationId);
    let conversation: ConversationItem | undefined;
    for (let i = 3; i > 0; i--) {
      try {
        conversation = await getConversationById(this.data.conversationId);
        break;
      } catch (e: any) {
        console.error(`getConversationById error: ${e?.message}${i > 0 ? ', retrying' : ''}`);
      }
    }
    if (!conversation) {
      console.log('getConversationById failed');
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      })
      return;
    }
    if (conversation.unreadCount > 0) {
      markConvMessageAsRead(conversation).then();
    }
    const [group, members] = await Promise.all([getGroup(conversation.groupID), getMemberList(conversation.groupID)]);
    if (!group) {
      console.log('getGroupById failed');
      await wx.showToast({
        title: '网络错误',
        icon: 'error',
      })
      return;
    }

    let commodity: Commodity | null = null;
    let help: Help | null = null;
    let commodityTact: Transaction | null = null;
    let helpTact: HelpTransaction | null = null;
    let seller: User;
    let buyer: User;

    const coAttr = await getCommodityGroupAttributes(group);
    const helpAttr = await getHelpGroupAttributes(group);
    console.log('co', coAttr);
    console.log('help', helpAttr);
    if (coAttr) {
      const { commodityId, sellerId, buyerId, transactionId } = coAttr;
      const [
        commodityResp,
        transactionResp,
        sellerResp,
        buyerResp
      ] = await Promise.all([
        CommodityAPI.getOne(commodityId),
        TransactionAPI.getById(transactionId),
        api.getUserInfo(sellerId),
        api.getUserInfo(buyerId),
      ]);
      if (commodityResp.isError || transactionResp.isError || sellerResp.isError || buyerResp.isError) {
        console.error(commodityResp, transactionResp, sellerResp, buyerResp);
        await wx.showToast({ title: '网络错误', icon: 'error' });
        return;
      }
      commodity = commodityResp.data!!;
      commodityTact = transactionResp.data!!;
      seller = sellerResp.data!!;
      buyer = buyerResp.data!!;
    } else if (helpAttr) {
      const { helpId, sellerId, buyerId, transactionId } = helpAttr;
      const [
        helpResp,
        transactionResp,
        sellerResp,
        buyerResp
      ] = await Promise.all([
        HelpAPI.getOne(helpId),
        HelpTransactionAPI.getById(transactionId),
        api.getUserInfo(sellerId),
        api.getUserInfo(buyerId),
      ]);
      if (helpResp.isError || transactionResp.isError || sellerResp.isError || buyerResp.isError) {
        console.error(helpResp, transactionResp, sellerResp, buyerResp);
        await wx.showToast({ title: '网络错误', icon: 'error' });
        return;
      }
      help = helpResp.data!!;
      helpTact = transactionResp.data!!;
      seller = sellerResp.data!!;
      buyer = buyerResp.data!!;
    } else {
      console.error('both coAttr and helpAttr is undefined');
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
      seller, buyer,
      conversation, group, members,
      commodityTact, helpTact,
    });
    this.updateOpenTime().then();
  },
  async onMessagePullDown() {
    await this.loadData();
  },
  /**
   * 更新用户上次查看会话的时间
   */
  async updateOpenTime() {
    if (this.data.commodityTact) {
      await TransactionAPI.userOpenConv(this.data.commodityTact.id);
    } else if (this.data.helpTact) {
      await HelpTransactionAPI.userOpenConv(this.data.helpTact.id);
    }
  },
  async onShow() {
    await this.updateOpenTime();
  },
  getConversationName(conversation: ConversationItem) {
    if (conversation.conversationType === SessionType.Group) {
      return conversation.showName;
    }
  },
  async sendTextMessage(text: string, updatePeerTransaction: boolean = false) {
    await this.inviteSeller();
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
    await this.inviteSeller();
    const { group } = this.data;
    if (!group) {
      return;
    }
    const info = await wx.getImageInfo({ src: img });
    const uuid = generateUUID();
    const res = await api.uploadImage(
      await compressImage(img, { width: 720 }),
      `chat/${getOpenId()}/${uuid}`
    );
    if (res.isError || !res.data) {
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
    if (this.data.commodityTact) {
      const tact = (await TransactionAPI.getById(this.data.commodityTact.id)).data;
      if (!tact) {
        return;
      }
      this.setData({ commodityTact: tact });
    } else if (this.data.helpTact) {
      const tact = (await HelpTransactionAPI.getById(this.data.helpTact.id)).data;
      if (!tact) {
        return;
      }
      this.setData({ helpTact: tact });
    }
  },
  onInputFocus() {
    this.setData({
      inputFocused: true,
    });
  },
  onInputBlur() {
    this.setData({
      inputFocused: false,
    });
  },
  onClickFakeInput() {
    this.setData({
      inputting: true,
    });
  },
  onInput(ev: Input) {
    this.setData({ input: ev.detail.value });
  },
  onEndInput() {
    this.setData({ inputting: false });
  },
  async onInputConfirm() {
    const input = this.data.input?.trim();
    if (!input) {
      return;
    }
    this.setData({
      inputting: false,
      input: '',
    });
    // checkNotifySettingAndRequest(this.data.commodity ? NotifyType.CommodityChat : NotifyType.HelpChat).then();
    requestNotifySubscribes([this.data.commodity ? NotifyType.CommodityChat : NotifyType.HelpChat]).then();
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
  /**
   * 刚建群之后卖家可能还没被拉进来，在发送消息的时候拉一下
   */
  async inviteSeller() {
    const { group, seller, isSeller, members } = this.data;
    if (isSeller) {
      return;
    }
    if (!group || !seller) {
      return;
    }
    // 卖家已经进群
    if (members.find(u => u.userID === getImUidFromUid(seller._id))) {
      return;
    }
    try {
      await oim.inviteUserToGroup({
        groupID: group.groupID,
        userIDList: [getImUidFromUid(seller._id)],
        reason: 'initial-message'
      });
    } catch (e) {
      toastError('会话初始化失败');
      metric.write('invite_seller_failed', { error: e?.toString() });
      throw e;
    }
  },
});