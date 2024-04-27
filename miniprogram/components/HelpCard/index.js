import getConstants from "../../constants";
import { buildShareParam } from "../../utils/share";
import api, { getOpenId, HelpCollectApi, HelpLikedApi } from "../../api/api";
import moment from 'moment';
import { DATETIME_FORMAT } from "../../utils/time";
import { ensureRegistered, getRegionPathName, sleep } from "../../utils/other";
import { openConversationDetail, openProfile } from "../../utils/router";

const app = getApp();
Component({
  properties: {
    help: {
      type: Object,
    },
    showRegionLevel: {
      type: Number,
      value: 0,
    }
  },

  data: {
    ...getConstants(),
    scrollToView: '',
    scrollToComment: false,
    ridToRegion: {},
    loading: true,
    isMine: false,
    createTime: '',
    regionName: '',
    seller: null,
    contentParagraphs: [],
    firstImageSize: [],
    hasImg: true,
    reportReasons: ['广告营销', '色情营销', '侵犯个人隐私 ', '辱骂诽谤他人', '虚假冒充'], // 可选择的举报原因列表
  },
  attached: async function () {
    const help = this.properties.help;
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
      createTime: moment(help.create_time).format(DATETIME_FORMAT),
      seller,
      contentParagraphs: help.content.split('\n').map(s => s.trim()),
      regionName: getRegionPathName(help.rid),
      isMine: self && self._id === help.uid,
      firstImageSize,
    });
  },
  methods: {

    async gotoDetail() {
      if (!this.properties.help) {
        return;
      }
      await wx.navigateTo({
        url: `../help_detail/index?id=${this.properties.help._id}`
      })
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
      const that = this;
      wx.showActionSheet({
        itemList: that.data.reportReasons,
        async success(res) {
          const selectedReason = that.data.reportReasons[res.tapIndex];
          const helpResp = await api.reportHelp({ id: that.data.help._id, report: selectedReason });
          if (helpResp.isError) {
            await wx.showToast({
              icon: 'error',
              title: '网络错误'
            });
            return;
          } else {
            wx.showToast({
              title: '举报成功',
              icon: 'success',
              duration: 2000,
            });
            await sleep(500);
            this.back();
          }
        },
      });

      // await wx.showToast({ title: '已举报' });
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
})