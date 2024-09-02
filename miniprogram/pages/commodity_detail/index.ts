import api from '../../api/api';
import { setNeedRefresh } from '../home/index';
import getConstants, { COMMODITY_STATUS_BOOKED, COMMODITY_POLISH_MIN_DURATION } from '../../constants';
import {
  ensureRegistered,
  ensureVerified,
  ensureVerifiedSync,
  getRegionPathName,
  sleep,
  toastError,
  toastSucceed
} from '../../utils/other';
import moment from 'moment';
import {
  DialogType,
  handleLink,
  openCommodityEdit,
  openConversationDetail,
  openDialog,
  openProfile,
} from '../../utils/router';
import { DATETIME_FORMAT } from '../../utils/time';
import { onShareCommodity, onShareCommoditySync, parseShareInfo, saveShareInfo, ShareInfo } from '../../utils/share';
import { isInSingleMode, updateSelfInfo, waitForAppReady } from '../../utils/globals';
import { startTransaction } from '../../utils/transaction';
import { CommodityAPI } from '../../api/CommodityAPI';
import { reportCommodity } from '../../utils/report';
import { Transaction, TransactionAPI, TransactionStatus } from '../../api/TransactionAPI';
import { metric } from '../../utils/metric';
import { textToRichText } from '../../utils/strings';
import { Commodity, User, ViewsInfo } from '../../types';
import { ViewsAPI } from '../../api/ViewsAPI';
import { openUsePolishCardDialog } from '../../components/UsePolishCardDialog/index';

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
    commodity: null as Commodity | null,
    transaction: null as Transaction | null,
    createTime: '',
    canPolishDuration: 0,
    polishTimeGeneral: '', // 2022/2/2 10:10
    regionName: '',
    seller: null as User | null,
    htmlContent: '',
    contentParagraphs: [],
    firstImageSize: [0, 0],
    showNotVerifiedDialog: false,
    statusImage: '',
    viewsInfo: null as ViewsInfo | null,
    shareInfo: null as ShareInfo | null
  },
  onLoad: async function (options) {
    await waitForAppReady();
    const { id, scrollToComment, shareInfo: shareInfoStr } = options;

    if (!id) {
      throw Error('invalid id');
    }
    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      saveShareInfo(shareInfo).then();
      this.setData({ shareInfo });
    }

    await this.loadData(id);
    this.setData({
      scrollToComment: Boolean((scrollToComment && scrollToComment !== 'false' && scrollToComment !== '0')),
    });

    if (!isInSingleMode()) {
      await ViewsAPI.addView(id, shareInfo?.fromUid);
    }
    metric.write('commodity_detail_show', {}, { id });
  },
  back() {
    wx.navigateBack().then();
  },
  async loadData(id: string) {
    const commResp = await CommodityAPI.getOne(id);
    if (commResp.isError) {
      await wx.showToast({
        icon: 'error',
        title: '网络错误'
      });
      return;
    }
    ViewsAPI.getViewsInfo(id).then(viewsInfo => {
      if (viewsInfo.isError) {
        console.error('failed to getViewsInfo', viewsInfo.message);
        return;
      }
      this.setData({ viewsInfo: viewsInfo.data })
    });
    const commodity = commResp.data;
    const sellerResp = await api.getUserInfo(commodity.seller_id);
    const seller = sellerResp.isError ? null : sellerResp.data;

    let firstImageSize = [0, 1];
    if (commodity.img_urls.length === 1) {
      try {
        const size = await wx.getImageInfo({
          src: `${commodity.img_urls[0]}/probe`
        });
        firstImageSize = [size.width, size.height];
      } catch (e) {
        firstImageSize = [500, 500];
      }
    }

    const { self } = app.globalData;
    const isMine = self && self._id === commodity.seller_id;

    let transaction: Transaction | null = null;

    if (!isInSingleMode()) {
      const transactionsResp = await TransactionAPI.listByCommodity(
        commodity._id,
        isMine ? { status: TransactionStatus.Booked } : undefined
      );
      transaction = transactionsResp.data?.[0] ?? null;
    }

    const statusImage = {
      [COMMODITY_STATUS_BOOKED]: '/images/已预订.png'
    }[commodity.status];

    this.setData({
      self,
      loading: false,
      commodity,
      transaction,
      createTime: moment(commodity.create_time).format(DATETIME_FORMAT),
      canPolishDuration: (commodity.polish_time ?? commodity.create_time) + COMMODITY_POLISH_MIN_DURATION - Date.now(),
      polishTimeGeneral: moment(commodity.polish_time ?? commodity.create_time).format(DATETIME_FORMAT),
      seller,
      contentParagraphs: commodity.content.split('\n').map(s => s.trim()),
      htmlContent: textToRichText(commodity.content),
      regionName: getRegionPathName(commodity.rid),
      isMine,
      firstImageSize,
      statusImage,
    });
  },

  polishing: false,
  async onPolish() {
    await ensureVerified();
    const { commodity } = this.data;
    if (this.polishing || !commodity)
      return;
    this.polishing = true;
    await wx.showLoading({ mask: true, title: '擦亮中...' });
    const resp = await api.polishCommodity({ id: commodity._id });
    await wx.hideLoading();
    this.polishing = false;
    if (resp.isError) {
      await wx.showToast({
        title: '擦亮失败',
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
    // 擦亮卡有可能-1了，更新下自己的信息
    updateSelfInfo();
  },
  async onDeactivate() {
    await ensureVerified();
    const { commodity } = this.data;
    if (!commodity) {
      return;
    }
    const reasons = ['已在小程序售出', '已在其他平台售出', '不想卖了', '其他原因']
    const { tapIndex: idx } = await wx.showActionSheet({
      itemList: reasons,
    })
    metric.write('deactivate_reason', {}, { id: commodity._id, reason: reasons[idx] });
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
    await openCommodityEdit(commodity, true);
    await this.loadData(commodity._id);
  },

  async previewImages(param) {
    const { curr } = param.currentTarget.dataset;
    await wx.previewImage({
      current: `${curr}/detail`,
      urls: this.data.commodity!!.img_urls.map(u => `${u}/detail`)
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
      if (!commodity) {
        throw Error('commodity is null');
      }
      if (commodity.is_collected) {
        const resp = await CommodityAPI.uncollect(commodity._id);
        if (resp.isError) {
          toastError('取消收藏失败');
          return;
        } else {
          toastSucceed('已取消收藏');
        }
      } else {
        const resp = await CommodityAPI.collect(commodity._id);
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
    if (this.data.commodity) {
      await reportCommodity(this.data.commodity._id);
    }
  },

  async onPrivateMessage() {
    if (isInSingleMode() || !this.data.commodity || !this.data.seller) {
      return;
    }
    await ensureVerified();
    let tact = this.data.transaction;
    if (!tact) {
      await wx.showLoading({
        title: '请稍后',
        mask: true
      });
      tact = await startTransaction(this.data.commodity, this.data.seller) ?? null;
      await wx.hideLoading();
      if (!tact) {
        toastError('发起私聊失败，请稍后再试');
        return;
      }
    }
    await openConversationDetail(tact.conversation_id);
  },

  async onAvatarClick() {
    if (this.data.seller) {
      await openProfile(this.data.seller);
    }
  },
  onCommentLoadFinished() {
    if (this.data.scrollToComment) {
      this.setData({
        scrollToView: 'comments'
      });
    }
  },

  // @ts-ignore
  async onShareAppMessage(options) {
    await ensureVerified();
    const { commodity } = this.data;
    if (!commodity) {
      return;
    }
    try {
      wx.showLoading({ title: '请稍等' });
      return await onShareCommodity(options, commodity);
    } finally {
      wx.hideLoading()
    }
  },
  onShareTimeline() {
    ensureVerifiedSync();
    if (this.data.commodity) {
      return onShareCommoditySync(this.data.commodity);
    }
  },

  async onLinkTap(ev) {
    const link = ev?.detail?.href || '';
    await handleLink(link);
  },
  onRichTextError(err) {
    console.error('onRichTextError', err);
    metric.write('rich_text_error', {}, { err: err?.toString() });
  },

  async onClickShareRuleQuestion() {
    await openDialog(DialogType.ShareRewardRule)
  }
});
