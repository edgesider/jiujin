// components/HelpCard.ts

import getConstants from "../../constants";
import { buildShareParam, parseShareInfo, reportShareInfo } from "../../utils/share";
import api, { getOpenId, HelpCollectApi, HelpLikedApi } from "../../api/api";
import moment from 'moment';
import { DATETIME_FORMAT } from "../../utils/time";
import { ensureRegistered, getRegionPath } from "../../utils/other";
import { openConversationDetail, openProfile } from "../../utils/router";
import { TransactionApi } from "../../api/transaction";
import {
  getConversationByGroup,
  getGroupIdForTransaction,
  getImUidFromUid,
  getOrCreateGroup, setCommodityGroupAttributes,
  tryDeleteConversationAndGroup
} from "../../utils/im";

const app = getApp();
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    help: {
      type: Object,
    },
    showRegionLevel: {
      type: Number,
      value: 0,
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    ...getConstants(),
    scrollToView: '',
    scrollToComment: false,
    ridToRegion: {},
    loading: true,
    isMine: false,
    help: null,
    createTime: '',
    regionName: '',
    seller: null,
    contentParagraphs: [],
    firstImageSize: [],
  },

  /**
   * 组件的方法列表
   */
  methods: {

    async gotoDetail() {
      if (!this.properties.help) {
        return;
      }
      await wx.navigateTo({
        url: `../help_detail/index?id=${this.properties.help._id}`
      })
    },
    /**
     * 获取展示的区域名，显示第1、3级
     */
    getRegionName(rid) {
      const path = getRegionPath(rid);
      const region = path[0];
      const parentParent = path[2];
      return parentParent ? `${parentParent.name} / ${region.name}` : region.name;
    },

    back() {
      wx.navigateBack().then();
    },
    async previewImages(param) {
      const { curr } = param.currentTarget.dataset;
      await wx.previewImage({
        current: curr,
        urls: this.data.help.img_urls
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
        if (this.data.help.is_collected) {
          const resp = await HelpCollectApi.cancel(this.data.help._id);
          if (resp.isError) {
            await wx.showToast({
              title: '取消收藏失败',
              icon: 'error',
            });
            return;
          }
        } else {
          const resp = await HelpCollectApi.collectHelp(this.data.help._id);
          if (resp.isError) {
            await wx.showToast({
              title: '收藏失败',
              icon: 'error',
            });
            return;
          }
        }
        this.setData({
          help: Object.assign(
            {},
            this.data.help,
            { is_collected: !this.data.help.is_collected }
          )
        })
      } finally {
        this.togglingCollect = false;
      }
    },
    togglingLike: false,
    async onToggleLike() {
      ensureRegistered();
      if (this.togglingLike) {
        return;
      }
      this.togglingLike = true;
      try {
        if (this.data.help.is_liked) {
          const resp = await HelpLikedApi.cancelLiked(this.data.help._id);
          if (resp.isError) {
            await wx.showToast({
              title: '取消点赞失败',
              icon: 'error',
            });
            return;
          }
        } else {
          const resp = await HelpLikedApi.likedHelp(this.data.help._id);
          if (resp.isError) {
            await wx.showToast({
              title: '点赞失败',
              icon: 'error',
            });
            return;
          }
        }
        this.setData({
          help: Object.assign(
            {},
            this.data.help,
            { is_liked: !this.data.help.is_liked }
          )
        })
      } finally {
        this.togglingLike = false;
      }
    },

    async onClickReport() {
      ensureRegistered();
      // TODO
      await wx.showToast({ title: '已举报' });
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
      const tact = await startHelpTransaction(this.data.help, this.data.seller);
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

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage(options) {
      const shareInfo = buildShareParam({
        type: 'help',
        from: options.from,
        helpId: this.data.help._id,
        fromUid: getOpenId(),
        timestamp: Date.now(),
        method: 'card'
      });
      return {
        title: '找到一个求助，快来看看吧！',
        path: '/pages/help_detail/index' +
          `?id=${this.data.help._id}` +
          `&shareInfo=${encodeURIComponent(shareInfo)}`
      }
    },
    onCommentLoadFinished() {
      if (this.data.scrollToComment) {
        this.setData({
          scrollToView: 'comments'
        });
      }
    },

  },

  attached:async function(){
    const options = this.properties.help;
    const {scrollToComment, shareInfo: shareInfoStr } = options;
    const helpId=options._id;
    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }

    const helpResp = await api.getHelpInfo({ id:helpId });
    if (helpResp.isError) {
      await wx.showToast({
        icon: 'error',
        title: '网络错误'
      });
      return;
    }
    const help = helpResp.data;
    const sellerResp = await api.getUserInfo(help.uid);
    const seller = sellerResp.isError ? null : sellerResp.data;

    let firstImageSize = [0, 1];
    if (help.img_urls.length === 1) {
      try {
        const size = await wx.getImageInfo({ src: help.img_urls[0] });
        firstImageSize = [size.width, size.height];
      } catch (e) {
        firstImageSize = [500, 500];
      }
    }
    const { self } = app.globalData;

    this.setData({
      loading: false,
      scrollToComment: (scrollToComment && scrollToComment !== 'false' && scrollToComment !== '0') ?? null,
      help,
      createTime: moment(help.create_time).format(DATETIME_FORMAT),
      seller,
      contentParagraphs: help.content.split('\n').map(s => s.trim()),
      regionName: this.getRegionName(help.rid),
      isMine: self && self._id === help.uid,
      firstImageSize,
    });
    console.log("this.data.contentParagraphs")
    console.log(this.data.contentParagraphs)


  },







})

/**
 * 根据商品和卖家创建群聊
 * TODO
 */
export async function startHelpTransaction(commodity, seller) {
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