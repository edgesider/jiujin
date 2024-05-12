import getConstants from "../../constants";
import { onShareHelp, parseShareInfo, reportShareInfo } from "../../utils/share";
import api, { HelpCollectApi, HelpLikedApi } from "../../api/api";
import moment from "moment";
import { DATETIME_FORMAT } from "../../utils/time";
import { ensureRegistered, getRegionPathName, sleep } from "../../utils/other";
import { openConversationDetail, openHelpEdit, openProfile } from "../../utils/router";
import { setNeedRefresh } from "../home/index";
import { startHelpTransaction } from "../../utils/transaction";

const app = getApp();

Page({
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
    hasImg: true,
    helpPolishTime: '',
    polishTimeGeneral: '',
  },

  onLoad: async function (options) {
    await app.waitForReady();
    const { id, scrollToComment, shareInfo: shareInfoStr } = options;

    const shareInfo = parseShareInfo(shareInfoStr);
    if (shareInfo) {
      console.log('shareInfo', shareInfo);
      reportShareInfo(shareInfo).then();
    }

    this.loadData(id);
    this.setData({
      scrollToComment: (scrollToComment && scrollToComment !== 'false' && scrollToComment !== '0') ?? null,
    })
  },

  async loadData(id) {
    const helpResp = await api.getHelpInfo({ id });
    if (helpResp.isError) {
      await wx.showToast({
        icon: 'error', title: '网络错误'
      });
      return;
    }
    const help = helpResp.data;
    const sellerResp = await api.getUserInfo(help.uid);
    const seller = sellerResp.isError ? null : sellerResp.data;
    let firstImageSize = [0, 1];
    if ((help.img_urls.length === 0) || (help.img_urls.length === 1 && help.img_urls[0] === "")) {
      firstImageSize = [500, 500];
      this.setData({
        hasImg: false
      })
    } else {
      try {
        const size = await wx.getImageInfo({ src: help.img_urls[0] });
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

    this.setData({
      loading: false,
      help,
      createTime: moment(help.create_time).format(DATETIME_FORMAT),
      helpPolishTime: moment(help.polish_time ?? help.create_time).fromNow(),
      polishTimeGeneral: moment(help.polish_time ?? help.create_time).format(DATETIME_FORMAT),
      seller,
      contentParagraphs: help.content.split('\n').map(s => s.trim()),
      regionName: getRegionPathName(help.rid),
      isMine: self && self._id === help.uid,
      firstImageSize,
    });
  },

  back() {
    wx.navigateBack().then();
  },

  polishing: false, async polish() {
    if (this.polishing) return;
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
    await openHelpEdit(this.data.help, true);
    await this.loadData(this.data.help._id);
  },

  async previewImages(param) {
    const { curr } = param.currentTarget.dataset;
    await wx.previewImage({
      current: curr, urls: this.data.help.img_urls
    });
  },

  togglingCollect: false, async onToggleCollect() {
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
            title: '取消收藏失败', icon: 'error',
          });
          return;
        }
      } else {
        const resp = await HelpCollectApi.collectHelp(this.data.help._id);
        if (resp.isError) {
          await wx.showToast({
            title: '收藏失败', icon: 'error',
          });
          return;
        }
      }
      this.setData({
        help: Object.assign({}, this.data.help, { is_collected: !this.data.help.is_collected })
      })
    } finally {
      this.togglingCollect = false;
    }
  },

  togglingLike: false, async onToggleLike() {
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
            title: '取消点赞失败', icon: 'error',
          });
          return;
        }
      } else {
        const resp = await HelpLikedApi.likedHelp(this.data.help._id);
        if (resp.isError) {
          await wx.showToast({
            title: '点赞失败', icon: 'error',
          });
          return;
        }
      }
      this.setData({
        help: Object.assign({}, this.data.help, { is_liked: !this.data.help.is_liked })
      })
    } finally {
      this.togglingLike = false;
    }
  },


  onClickReport() {
    ensureRegistered();
    // TODO
  },

  async onClickShare() {
    ensureRegistered();
    const {} = await wx.showShareMenu({
      withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'],
    })
  },

  async onPrivateMessage() {
    ensureRegistered();
    await wx.showLoading({
      title: '请稍后', mask: true
    })
    const tact = await startHelpTransaction(this.data.help, this.data.seller);
    await wx.hideLoading();
    if (!tact) {
      await wx.showToast({
        title: '发起私聊失败，请稍后再试', icon: 'error'
      });
      return;
    }
    await openConversationDetail(tact.conversation_id);
  },

  async onAvatarClick() {
    await openProfile(this.data.seller);
  },

  onShareAppMessage(options) {
    return onShareHelp(options)
  }, onCommentLoadFinished() {
    if (this.data.scrollToComment) {
      this.setData({
        scrollToView: 'comments'
      });
    }
  },
})
