import api, { getOpenId } from "../../api/api";
import { setNeedRefresh } from "../home/index";
import getConstants from "../../constants";
import {
  ensureRegistered,
  ensureVerified,
  getRegionPathName,
  sleep,
  toastError,
  toastSucceed
} from "../../utils/other";
import moment from "moment";
import { openCommodityEdit, openConversationDetail, openProfile, openVerify } from "../../utils/router";
import { DATETIME_FORMAT } from "../../utils/time";
import { buildShareParam, parseShareInfo, reportShareInfo } from "../../utils/share";
import { waitForAppReady } from "../../utils/globals";
import { startTransaction } from "../../utils/transaction";
import { CommodityAPI } from "../../api/CommodityAPI";
import { reportCommodity } from "../../utils/report";
import { drawCommodityShareImage } from "../../utils/canvas";
import { TransactionAPI, TransactionStatus } from "../../api/TransactionAPI";

const app = getApp();

Page({
  data: {
    ...getConstants(),
    self,
    scrollToView: '',
    scrollToComment: false,
    ridToRegion: {},
    loading: true,
    isMine: false,
    commodity: null,
    transaction: null,
    createTime: '',
    polishTime: '', // 3天前
    polishTimeGeneral: '', // 2022/2/2 10:10
    regionName: '',
    seller: null,
    contentParagraphs: [],
    firstImageSize: [],
    showNotVerifiedDialog: false,
  },
  onLoad: async function (options) {
    await waitForAppReady();
    const { id, scrollToComment, shareInfo: shareInfoStr } = options;

    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }

    await this.loadData(id);
    this.setData({
      scrollToComment: (scrollToComment && scrollToComment !== 'false' && scrollToComment !== '0') ?? null,
    });

    await api.addViewCount(id);
  },
  back() {
    wx.navigateBack().then();
  },
  async loadData(id) {
    const commResp = await CommodityAPI.getOne(id);
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
    const isMine = self && self._id === commodity.seller_id;

    const transactionsResp = await TransactionAPI.listByCommodity(
      commodity._id,
      isMine ? { status: TransactionStatus.Booked } : null
    );
    const transaction = transactionsResp.data?.[0];

    this.setData({
      self,
      loading: false,
      commodity,
      transaction,
      createTime: moment(commodity.create_time).format(DATETIME_FORMAT),
      polishTime: moment(commodity.polish_time ?? commodity.create_time).fromNow(),
      polishTimeGeneral: moment(commodity.polish_time ?? commodity.create_time).format(DATETIME_FORMAT),
      seller,
      contentParagraphs: commodity.content.split('\n').map(s => s.trim()),
      regionName: getRegionPathName(commodity.rid),
      isMine,
      firstImageSize,
    });
  },

  polishing: false,
  async onPolish() {
    await ensureVerified();
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
  async onDeactivate() {
    await ensureVerified();
    const { commodity } = this.data;
    if (!commodity) {
      return;
    }
    const { confirm } = await wx.showModal({ title: '确认下架该商品？' });
    if (!confirm) {
      return;
    }
    await wx.showLoading({ mask: true, title: '正在下架...' });
    const resp = await api.deactivateCommodity({ id: commodity._id, });
    await wx.hideLoading();
    if (resp.isError) {
      console.error(resp)
      await wx.showToast({ title: '下架失败', icon: 'error', mask: true });
      return;
    }
    await wx.showToast({ title: '下架成功', icon: 'success', mask: true });
    await this.loadData(commodity._id);
  },
  async onActivate() {
    await ensureVerified();
    const { commodity } = this.data;
    if (!commodity) {
      return;
    }
    await wx.showLoading({ mask: true, title: '正在重新上架...' });
    const resp = await api.activateCommodity({ id: commodity._id, });
    await wx.hideLoading();
    if (resp.isError) {
      console.error(resp)
      await wx.showToast({ title: '上架失败', icon: 'error', mask: true });
      return;
    }
    await wx.showToast({ title: '上架成功', icon: 'success', mask: true });
    await this.loadData(commodity._id);
  },
  async onEdit() {
    await ensureVerified();
    const { commodity } = this.data;
    if (!commodity) {
      return;
    }
    await openCommodityEdit(this.data.commodity, true);
    await this.loadData(commodity._id);
  },

  async previewImages(param) {
    const { curr } = param.currentTarget.dataset;
    await wx.previewImage({
      current: `${curr}/detail`,
      urls: this.data.commodity.img_urls.map(u => `${u}/detail`)
    });
  },

  togglingCollect: false,
  async onToggleCollect() {
    await ensureVerified();
    ensureRegistered();
    if (this.togglingCollect) {
      return;
    }
    this.togglingCollect = true;
    try {
      const { commodity } = this.data;
      if (commodity.is_collected) {
        const resp = await CommodityAPI.uncollect(this.data.commodity._id);
        if (resp.isError) {
          toastError('取消收藏失败');
          return;
        } else {
          toastSucceed('已取消收藏');
        }
      } else {
        const resp = await CommodityAPI.collect(this.data.commodity._id);
        if (resp.isError) {
          toastError('收藏失败');
          return;
        } else {
          toastSucceed('已收藏');
        }
      }
      const newCommodity = { ...commodity };
      newCommodity.is_collected = !commodity.is_collected;
      newCommodity.collected_count = newCommodity.is_collected
        ? commodity.collected_count + 1
        : commodity.collected_count - 1;
      this.setData({
        commodity: newCommodity
      })
    } finally {
      this.togglingCollect = false;
    }
  },

  async onClickReport() {
    await ensureVerified();
    await reportCommodity(this.data.commodity._id);
  },

  // async onClickShare() {
  // ensureRegistered();
  // const {} = await wx.showShareMenu({
  //   withShareTicket: true,
  //   menus: ['shareAppMessage', 'shareTimeline'],
  // })
  // },

  async onPrivateMessage() {
    await ensureVerified();
    let tact = this.data.transaction;
    if (!tact) {
      await wx.showLoading({
        title: '请稍后',
        mask: true
      })
      tact = await startTransaction(this.data.commodity, this.data.seller);
      await wx.hideLoading();
      if (!tact) {
        toastError('发起私聊失败，请稍后再试');
        return;
      }
    }
    await openConversationDetail(tact.conversation_id);
  },

  async onAvatarClick() {
    await openProfile(this.data.seller);
  },

  async onShareAppMessage(options) {
    await ensureVerified();
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
    const path = await drawCommodityShareImage(commodity);
    return {
      title: '闲置 | ' + commodity.content,
      path: '/pages/commodity_detail/index' +
        `?id=${commodity._id}` +
        `&shareInfo=${encodeURIComponent(shareInfo)}`,
      imageUrl: path,
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
