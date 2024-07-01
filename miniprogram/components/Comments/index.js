import { handleLink, openProfile } from "../../utils/router";
import { ensureRegistered, ensureVerified, kbHeightChanged, toastError } from "../../utils/other";
import getConstants from "../../constants";
import { Subscription } from "rxjs";
import { CommentAPI } from "../../api/CommentAPI";
import { EntityType } from "../../types";
import moment from "moment";
import { DATETIME_FORMAT } from "../../utils/time";
import { ErrCode } from "../../api/ErrCode";
import { NotifyType, requestNotifySubscribes } from "../../utils/notify";
import { textToRichText } from "../../utils/strings";
import { metric } from "../../utils/metric";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
    },
    help: {
      type: Object,
    },
  },
  data: {
    ...getConstants(),
    selfInfo: null,
    error: false,
    comments: [],
    idToComment: {},
    keyboardHeight: 0,
    commenting: false,
    // 正在回复的消息，一级评论时为空
    commentingTo: null,
    commentingText: '',
  },
  async attached() {
    this.subscription = new Subscription();

    this.setData({ selfInfo: app.globalData.self, })
    this.subscription.add(kbHeightChanged.subscribe(res => {
      this.setData({
        keyboardHeight: res.height,
      })
    }));

    await this.fetchComments();
    this.triggerEvent('loadFinished');
  },
  async detached() {
    this.subscription?.unsubscribe();
  },
  methods: {
    nop() {},
    getEntityId() {
      const id = this.properties.commodity?._id ?? this.properties.help._id;
      if (!id) {
        throw Error('neither commodity nor help provided');
      }
      return id;
    },
    getEntityType() {
      if (this.properties.commodity) {
        return EntityType.Commodity;
      } else if (this.properties.help) {
        return EntityType.Help;
      } else {
        throw Error('neither commodity nor help provided');
      }
    },
    async fetchComments() {
      const resp = await CommentAPI.get(this.getEntityId());
      if (resp.isError) {
        console.error(resp);
        this.setData({ error: true });
        return;
      }
      const comments = resp.data;
      const idToComment = {};
      const idToChildren = new Map();
      for (const c of comments) {
        idToComment[c.id] = c;
        const list = idToChildren.get(c.reply_to) ?? [];
        list.push(c);
        idToChildren.set(c.reply_to, list);
      }
      const collectChildren = (id, level) => {
        const children = [];
        for (const c of idToChildren.get(id) ?? []) {
          children.push({
            ...c,
            level,
            timeStr: moment(c.create_time).format(DATETIME_FORMAT),
            htmlContent: textToRichText(c.content)
          });
          children.push(...collectChildren(c.id, level + 1));
        }
        return children;
      }
      this.setData({
        comments: collectChildren(-1, 0),
        idToComment,
      })
    },
    async sendComment(content, replyTo) {
      const resp = await CommentAPI.add(this.getEntityId(), this.getEntityType(), content, replyTo ?? -1);
      if (resp.isError) {
        console.error(resp);
        toastError(resp.errno === ErrCode.SecCheckError ? '内容含有违法违规内容' : '发送失败');
        return;
      }
      await this.fetchComments();
    },
    async openMyProfile() {
      ensureRegistered();
      await openProfile(app.globalData.self);
    },
    async openProfile(ev) {
      const { sender } = ev.currentTarget.dataset.comment;
      await openProfile(sender);
    },
    async onLongPress({ currentTarget: { dataset: { comment } } }) {
      const options = [];
      options.push({
        text: '复制',
        action: 'copy',
      });
      if (comment.sender._id === app.globalData.self?._id) {
        options.push({
          text: '删除',
          action: 'delete',
        });
      }
      const { tapIndex } = await wx.showActionSheet({
        itemList: options.map(o => o.text),
      })
      const action = options[tapIndex].action;
      if (action === 'copy') {
        await wx.setClipboardData({ data: comment.content })
      } else if (action === 'delete') {
        const { confirm } = await wx.showModal({
          content: '确认删除此条评论',
        });
        if (!confirm) {
          return;
        }
        const resp = await CommentAPI.del(comment.id);
        if (resp.isError) {
          console.log(resp);
          toastError('删除失败');
        } else {
          await this.fetchComments();
        }
      }
    },
    async onDeleteComment({ currentTarget: { dataset: { comment } } }) {
      const { confirm } = await wx.showModal({
        content: '确认删除此条评论',
      });
      if (!confirm) {
        return;
      }
      const resp = await CommentAPI.del(comment.id);
      if (resp.isError) {
        console.log(resp);
        toastError('删除失败');
      } else {
        await this.fetchComments();
      }
    },
    onPopupInput(ev) {
      this.setData({ commentingText: ev.detail.value });
    },
    async onStartComment({ currentTarget: { dataset: { comment } } }) {
      if (getConstants().Platform === 'ios') {
        // iOS 用键盘发送时，获取不了订阅消息，所以放到这里获取
        wx.showLoading();
        await requestNotifySubscribes([NotifyType.Comment]);
        wx.hideLoading()
      }
      this.setData({
        commenting: true,
        commentingTo: comment ?? null, // 如果是回复则有这个字段
      })
    },
    requesting: false,
    async onConfirmComment() {
      if (this.requesting) {
        return;
      }
      this.requesting = true;
      try {
        await wx.showLoading();
        if (getConstants().Platform !== 'ios') {
          // 安卓在发送时获取[
          await requestNotifySubscribes([NotifyType.Comment]);
        }
        await ensureVerified();
        const { commentingText, commentingTo } = this.data;
        const text = commentingText.trim();
        if (text) {
          await this.sendComment(text, commentingTo?.id);
        }
        this.onEndComment();
      } finally {
        this.requesting = false;
        await wx.hideLoading();
      }
    },
    onEndComment() {
      this.setData({
        commenting: false,
        commentingTo: null,
        commentingText: '',
      })
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
  }
});
