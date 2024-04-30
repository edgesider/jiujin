import getConstants from '../../constants';
import api, { getOpenId, HelpCollectApi, HelpLikedApi } from '../../api/api';
import moment from 'moment';
import { DATETIME_FORMAT } from '../../utils/time';
import { ensureRegistered, getRegionPathName, sleep } from '../../utils/other';
import { openConversationDetail, openProfile } from '../../utils/router';
import { Help, Region, User } from '../../types';
import { startHelpTransaction } from '../../utils/transaction';

type BaseEvent = WechatMiniprogram.BaseEvent;
const app = getApp();

Component({
  properties: {
    help: {
      type: Object,
    },
    currRegionLevel: {
      type: Number,
      value: 0,
    }
  },

  data: {
    ...getConstants(),
    imageAreaHeight: 0,
    scrollToView: '',
    scrollToComment: false,
    ridToRegion: {} as Record<number, Region>,
    loading: true,
    isMine: false,
    createTime: '',
    regionName: '',
    user: null as User | null,
    contentParagraphs: [] as string[],
    // 单个图片时，图片的样式
    firstImageStyle: '',
    imgCount: 0,
    hasImg: true,
    reportReasons: ['广告营销', '色情营销', '侵犯个人隐私 ', '辱骂诽谤他人', '虚假冒充'], // 可选择的举报原因列表
  },
  lifetimes: {
    attached: async function () {
      const help = this.properties.help as Help;
      const { self } = app.globalData;

      (async () => {
        if (help.img_urls.length === 1) {
          let ratio = 0;
          try {
            const size = await wx.getImageInfo({ src: help.img_urls[0] });
            ratio = size.width / size.height;
          } catch (e) {
            ratio = 0;
          }
          this.setData({
            firstImageStyle: `height: 60vw; width: calc(60vw * ${ratio});`,
          });
        }
      })().then();

      this.setData({
        loading: false,
        createTime: moment(help.create_time).format(DATETIME_FORMAT),
        contentParagraphs: help.content.split('\n').map(s => s.trim()),
        regionName: getRegionPathName(help.rid),
        isMine: self && self._id === help.uid,
        hasImg: help.img_urls.length > 0
      });

      const userResp = await api.getUserInfo(help.uid);
      const user = userResp.isError ? null : userResp.data;
      this.setData({ user });
    },
  },
  methods: {
    getImageCells(images: string[]): string[][] {
      switch (images.length) {
        case 0:
          return [];
        case 1:
          return [images];
        case 4:
          return [
            [images[0], images[1]],
            [images[2], images[3]]
          ];
        default:
          const rows: string[][] = [];
          const row: string[] = [];
          for (let i = 0; i < images.length; i++) {
            if (row.length === 3) {
              rows.push([...row]);
              row.length = 0;
            } else {
              row.push(images[i]);
            }
          }
          if (row.length > 0) {
            rows.push(row);
          }
          return rows;
      }
    },
    async gotoDetail() {
      if (!this.properties.help) {
        return;
      }
      await wx.navigateTo({
        url: `../help_detail/index?id=${this.properties.help._id}`
      })
    },
    async previewImages(param: BaseEvent) {
      const { curr } = param.currentTarget.dataset;
      await wx.previewImage({
        current: curr,
        urls: this.data.help.img_urls
      });
    },

    // @ts-ignore
    togglingCollect: false,
    async onToggleCollect() {
      ensureRegistered();
      if (this.togglingCollect) {
        return;
      }
      // @ts-ignore
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
        // @ts-ignore
        this.togglingCollect = false;
      }
    },

    // @ts-ignore
    togglingLike: false,
    async onToggleLike() {
      ensureRegistered();
      if (this.togglingLike) {
        return;
      }
      // @ts-ignore
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
        // @ts-ignore
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
            // TODO 移除
          }
        },
      });
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
      const tact = await startHelpTransaction(this.data.help as Help, this.data.user!!);
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
      if (this.data.user) {
        await openProfile(this.data.user);
      }
    },
  },
})