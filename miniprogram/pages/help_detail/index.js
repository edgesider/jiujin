import getConstants, { POLISH_MIN_DURATION } from "../../constants";
import { onShareHelp, parseShareInfo, saveShareInfo } from "../../utils/share";
import api from "../../api/api";
import moment from "moment";
import { DATETIME_FORMAT } from "../../utils/time";
import {
  ensureVerified,
  getRegionPathName,
  sleep,
  toastError,
  toastSucceed
} from "../../utils/other";
import { handleLink, openConversationDetail, openHelpEdit, openProfile } from "../../utils/router";
import { setNeedRefresh } from "../home/index";
import { startHelpTransaction } from "../../utils/transaction";
import { HelpAPI } from "../../api/HelpAPI";
import { reportHelp } from "../../utils/report";
import { HelpTransactionAPI, HelpTransactionStatus } from "../../api/HelpTransactionAPI";
import { metric } from "../../utils/metric";
import { textToRichText } from "../../utils/strings";

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
    help: null,
    transaction: null,
    createTime: '',
    regionName: '',
    seller: null,
    htmlContent: '',
    contentParagraphs: [],
    firstImageSize: [],
    hasImg: true,
    canPolishDuration: 0,
    polishTimeGeneral: '',
  },

  onLoad: async function (options) {
    await app.waitForReady();
    const { id, scrollToComment, shareInfo: shareInfoStr } = options;

    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      saveShareInfo(shareInfo).then();
    }

    await this.loadData(id);
    this.setData({
      scrollToComment: (scrollToComment && scrollToComment !== 'false' && scrollToComment !== '0') ?? null,
    });

    await HelpAPI.addViewCount(id);
    metric.write('help_detail_show', { id: id, shareInfo: shareInfoStr });
  },

  async loadData(id) {
    const helpResp = await HelpAPI.getOne(id);
    if (helpResp.isError) {
      await wx.showToast({
        icon: 'error', title: '网络错误'
      });
      return;
    }
    const help = helpResp.data;

    const sellerResp = await api.getUserInfo(help.seller_id);
    const seller = sellerResp.isError ? null : sellerResp.data;
    let firstImageSize = [0, 1];
    if ((help.img_urls.length === 0) || (help.img_urls.length === 1 && help.img_urls[0] === "")) {
      firstImageSize = [500, 500];
      this.setData({
        hasImg: false
      })
    } else {
      try {
        const size = await wx.getImageInfo({
          src: `${help.img_urls[0]}/probe`
        });
        firstImageSize = [size.width, size.height];
      } catch (e) {
        firstImageSize = [500, 500];
        this.setData({
          hasImg: false
        })
      }
      this.setData({
        hasImg: true
      })
    }

    const { self } = app.globalData;
    const isMine = self && self._id === help.seller_id;

    const transactionsResp = await HelpTransactionAPI.listByHelp(
      help._id,
      isMine ? { status: HelpTransactionStatus.Booked } : null
    );
    const transaction = transactionsResp.data?.[0];

    this.setData({
      self,
      loading: false,
      help,
      transaction,
      createTime: moment(help.create_time).format(DATETIME_FORMAT),
      canPolishDuration: (help.polish_time ?? help.create_time) + POLISH_MIN_DURATION - Date.now(),
      polishTimeGeneral: moment(help.polish_time ?? help.create_time).format(DATETIME_FORMAT),
      seller,
      htmlContent: textToRichText(help.content),
      contentParagraphs: help.content.split('\n').map(s => s.trim()),
      regionName: getRegionPathName(help.rid),
      isMine: self && self._id === help.seller_id,
      firstImageSize,
    });
  },

  back() {
    wx.navigateBack().then();
  },

  polishing: false,
  async onPolish(ev) {
    if (ev.detail.remain > 0) {
      // 倒计时未结束
      return;
    }
    await ensureVerified();
    if (this.polishing)
      return;
    this.polishing = true;
    await wx.showLoading({ mask: true, title: '擦亮中...' });
    const resp = await api.polishHelp({ id: this.data.help._id });
    await wx.hideLoading();
    this.polishing = false;
    if (resp.isError) {
      await wx.showToast({
        title: '三小时可擦亮一次', icon: 'error', mask: true,
      });
      return;
    }
    await wx.showToast({
      title: '擦亮成功', icon: 'success', mask: true, duration: 500,
    });
    await sleep(500);
    setNeedRefresh();
    this.back();
  },

  async edit() {
    await ensureVerified();
    await openHelpEdit(this.data.help, true);
    await this.loadData(this.data.help._id);
  },

  async previewImages(param) {
    const { curr } = param.currentTarget.dataset;
    await wx.previewImage({
      current: `${curr}/detail`,
      urls: this.data.help.img_urls.map(u => `${u}/detail`)
    });
  },

  async onDeactivate() {
    await ensureVerified();
    const { confirm } = await wx.showModal({
      title: '确认结束？',
      content: ''
    });
    if (!confirm) {
      return;
    }
    await wx.showLoading({ mask: true, title: '请稍后' });
    const resp = await api.deactivateHelp({ id: this.data.help._id, })
    await wx.hideLoading();
    if (resp.isError) {
      console.error(resp)
      toastError('网络错误');
      return;
    }
    toastSucceed('已结束');
  },

  togglingCollect: false,
  async onToggleCollect() {
    await ensureVerified();
    if (this.togglingCollect) {
      return;
    }
    this.togglingCollect = true;
    const { help } = this.data;
    try {
      if (help.is_collected) {
        const resp = await HelpAPI.uncollect(help._id);
        if (resp.isError) {
          toastError('取消收藏失败');
          return;
        } else {
          toastSucceed('已取消收藏');
        }
      } else {
        const resp = await HelpAPI.collect(help._id);
        if (resp.isError) {
          toastError('收藏失败');
          return;
        } else {
          toastSucceed('已收藏');
        }
      }
      const newHelp = { ...help };
      newHelp.is_collected = !help.is_collected;
      newHelp.collected_count = newHelp.is_collected ? help.collected_count + 1 : help.collected_count - 1;
      this.setData({ help: newHelp, })
    } finally {
      this.togglingCollect = false;
    }
  },

  togglingLike: false,
  async onToggleLike() {
    await ensureVerified();
    if (this.togglingLike) {
      return;
    }
    this.togglingLike = true;
    const { help } = this.data;
    try {
      if (help.is_liked) {
        const resp = await HelpAPI.unlike(help._id);
        if (resp.isError) {
          toastError('取消点赞失败');
          return;
        } else {
          toastSucceed('已取消点赞');
        }
      } else {
        const resp = await HelpAPI.like(help._id);
        if (resp.isError) {
          toastError('点赞失败');
          return;
        } else {
          toastSucceed('已点赞');
        }
      }
      const newHelp = { ...help };
      newHelp.is_liked = !help.is_liked;
      newHelp.liked_count = newHelp.is_liked ? help.liked_count + 1 : help.liked_count - 1;
      this.setData({ help: newHelp, })
    } finally {
      this.togglingLike = false;
    }
  },

  async onClickReport() {
    await ensureVerified();
    await reportHelp(this.data.help._id);
  },

  async onClickShare() {
    await ensureVerified();
    const {} = await wx.showShareMenu({
      withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'],
    })
  },

  async onPrivateMessage() {
    await ensureVerified();
    let tact = this.data.transaction;
    if (!tact) {
      await wx.showLoading({
        title: '请稍后',
        mask: true
      })
      tact = await startHelpTransaction(this.data.help, this.data.seller);
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
    try {
      wx.showLoading({ title: '请稍等' });
      return await onShareHelp(options, this.data.help);
    } finally {
      wx.hideLoading();
    }
  },
  onCommentLoadFinished() {
    if (this.data.scrollToComment) {
      this.setData({
        scrollToView: 'comments'
      });
    }
  },

  async onLinkTap(ev) {
    console.log('linkTap', ev);
    const link = ev?.detail?.href || '';
    await handleLink(link);
  },
  onRichTextError(err) {
    console.error('onRichTextError', err);
    metric.write('rich_text_error', {}, { err: err?.toString() });
  }
})
