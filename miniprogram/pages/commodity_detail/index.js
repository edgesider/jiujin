import api, { CollectApi, getOpenId } from "../../api/api";
import { setNeedRefresh } from "../home/index";
import getConstants from "../../constants";
import { ensureRegistered, getRegionPath, getRegionPathName, sleep } from "../../utils/other";
import moment from "moment";
import { openConversationDetail, openProfile } from "../../utils/router";
import {
  getConversationByGroup,
  getGroupIdForTransaction,
  getImUidFromUid,
  getOrCreateGroup, setCommodityGroupAttributes, tryDeleteConversationAndGroup,
} from "../../utils/im";
import { TransactionApi } from "../../api/transaction";
import { DATETIME_FORMAT } from "../../utils/time";
import { buildShareParam, parseShareInfo, reportShareInfo } from "../../utils/share";

const app = getApp();

Page({
  data: {
    ...getConstants(),
    scrollToView: '',
    scrollToComment: false,
    ridToRegion: {},
    loading: true,
    isMine: false,
    commodity: null,
    createTime: '',
    polishTime: '', // 3天前
    polishTimeGeneral: '', // 2022/2/2 10:10
    regionName: '',
    seller: null,
    contentParagraphs: [],
    firstImageSize: [],
  },
  onLoad: async function (options) {
    await app.waitForReady();
    const { id, scrollToComment, shareInfo: shareInfoStr } = options;

    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }

    const commResp = await api.getCommodityInfo({ id });
    if (commResp.isError) {
      await wx.showToast({
        icon: 'error',
        title: '网络错误'
      });
      return;
    }
    const commodity = commResp.data;

    const sellerResp = await api.getUserInfo(commodity.seller_id);
    const seller = sellerResp.isError ? null : sellerResp.data;

    let firstImageSize = [0, 1];
    if (commodity.img_urls.length === 1) {
      try {
        const size = await wx.getImageInfo({ src: commodity.img_urls[0] });
        firstImageSize = [size.width, size.height];
      } catch (e) {
        firstImageSize = [500, 500];
      }
    }

    const { self } = app.globalData;

    this.setData({
      loading: false,
      scrollToComment: (scrollToComment && scrollToComment !== 'false' && scrollToComment !== '0') ?? null,
      commodity,
      createTime: moment(commodity.create_time).format(DATETIME_FORMAT),
      polishTime: moment(commodity.polish_time ?? commodity.create_time).fromNow(),
      polishTimeGeneral: moment(commodity.polish_time ?? commodity.create_time).format(DATETIME_FORMAT),
      seller,
      contentParagraphs: commodity.content.split('\n').map(s => s.trim()),
      regionName: getRegionPathName(commodity.rid),
      isMine: self && self._id === commodity.seller_id,
      firstImageSize,
    });

    await api.addViewCount(id);
  },
  back() {
    wx.navigateBack().then();
  },

  polishing: false,
  async polish() {
    if (this.polishing)
      return;
    this.polishing = true;
    await wx.showLoading({ mask: true, title: '擦亮中...' });
    const resp = await api.polishCommodity({ id: this.data.commodity._id });
    await wx.hideLoading();
    this.polishing = false;
    if (resp.isError) {
      await wx.showToast({
        title: '三小时可擦亮一次',
        icon: 'error',
        mask: true,
      });
      return;
    }
    await wx.showToast({
      title: '擦亮成功',
      icon: 'success',
      mask: true,
      duration: 500,
    });
    await sleep(500);
    setNeedRefresh();
    this.back();
  },

  async previewImages(param) {
    const { curr } = param.currentTarget.dataset;
    await wx.previewImage({
      current: curr,
      urls: this.data.commodity.img_urls
    });
  },

  togglingCollect: false,
  async onToggleCollect() {
    ensureRegistered();
    if (this.togglingCollect) {
      return;
    }
    this.togglingCollect = true;
    try {
      if (this.data.commodity.is_collected) {
        const resp = await CollectApi.cancel(this.data.commodity._id);
        if (resp.isError) {
          await wx.showToast({
            title: '取消收藏失败',
            icon: 'error',
          });
          return;
        }
      } else {
        const resp = await CollectApi.collect(this.data.commodity._id);
        if (resp.isError) {
          await wx.showToast({
            title: '收藏失败',
            icon: 'error',
          });
          return;
        }
      }
      this.setData({
        commodity: Object.assign(
          {},
          this.data.commodity,
          { is_collected: !this.data.commodity.is_collected }
        )
      })
    } finally {
      this.togglingCollect = false;
    }
  },

  onClickReport() {
    ensureRegistered();
    // TODO
  },

  async onClickShare() {
    ensureRegistered();
    const {} = await wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    })
  },

  async onPrivateMessage() {
    ensureRegistered();
    await wx.showLoading({
      title: '请稍后',
      mask: true
    })
    const tact = await startTransaction(this.data.commodity, this.data.seller);
    await wx.hideLoading();
    if (!tact) {
      await wx.showToast({
        title: '发起私聊失败，请稍后再试',
        icon: 'error'
      });
      return;
    }
    await openConversationDetail(tact.conversation_id);
  },

  async onAvatarClick() {
    await openProfile(this.data.seller);
  },

  onShareAppMessage(options) {
    const { commodity } = this.data;
    if (!commodity) {
      return;
    }
    const shareInfo = buildShareParam({
      type: 'commodity',
      from: options.from,
      commodityId: commodity._id,
      fromUid: getOpenId(),
      timestamp: Date.now(),
      method: 'card'
    });
    return {
      title: '我找到一个好东西，快来看看吧！',
      path: '/pages/commodity_detail/index' +
        `?id=${commodity._id}` +
        `&shareInfo=${encodeURIComponent(shareInfo)}`,
      imageUrl: commodity.img_urls[0]
    }
  },
  onCommentLoadFinished() {
    if (this.data.scrollToComment) {
      this.setData({
        scrollToView: 'comments'
      });
    }
  },
});

/**
 * 根据商品和卖家创建群聊
 */
export async function startTransaction(commodity, seller) {
  const transactions = await TransactionApi.listByCommodity(commodity._id);
  if (transactions.isError) {
    console.error('failed to query existed transactions');
    return;
  }
  const transaction = transactions.data?.[0];
  if (transaction) {
    return transaction;
  }
  const [group, newCreate] = await getOrCreateGroup(
    getGroupIdForTransaction(),
    {
      name: seller.name,
      avatar: commodity.img_urls[0],
      members: [
        getImUidFromUid(getOpenId()),
        getImUidFromUid(seller._id),
      ],
    }
  );
  console.log(`created group ${group.groupID} for commodity ${commodity._id}`);
  const conv = await getConversationByGroup(group.groupID);
  if (!conv) {
    console.error('failed to get conversation');
    return;
  }
  console.log(`starting transaction: commodity=${commodity._id} conversation=${conv.conversationID}`)
  const resp = await TransactionApi.start(commodity._id, conv.conversationID);
  if (resp.isError) {
    console.error('failed to start a new transaction');
    await tryDeleteConversationAndGroup(conv);
    return;
  }
  const tact = resp.data;
  await setCommodityGroupAttributes(group.groupID, {
    commodityId: commodity._id,
    sellerId: seller._id,
    transactionId: tact.id,
    buyerId: getOpenId(),
  });
  return tact;
}
