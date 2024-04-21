// components/HelpComments/index.ts
import getConstants from "../../constants";
import api, {  HelpCommentAPI } from "../../api/api";
import { ensureRegistered } from "../../utils/other";
import { openProfile } from "../../utils/router";

const app = getApp();

Component({

  /**
   * 组件的属性列表
   */
  properties: {
    help: {
      type: Object,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    ...getConstants(),
    selfInfo: null,
    comments: [],
    keyboardHeight: 0,
    commenting: false,
    // 正在回复的消息，一级留言时为空
    commentingTo: null,
    commentingText: '',
  },
  async attached() {
    this.setData({ selfInfo: app.globalData.self, })
    wx.onKeyboardHeightChange((res) => {
      this.setData({
        keyboardHeight: res.height,
      })
    })
    await this.fetchComments();

    this.triggerEvent('loadFinished');
  },

  /**
   * 组件的方法列表
   */
  methods: {
    nop() {},
    async fetchComments() {
      const comments = [];
      console.log(this.properties.help)
      const { data: questions } = await HelpCommentAPI.getHelpQuestionsAndAnswers(this.properties.help._id, 0, 10);
      console.log("questions")
      console.log(questions)
      for (const question of questions) {
        const { data: user } = await api.getUserInfo(question.user_id);
        if (!user) {
          continue;
        }
        comments.push({
          type: 'question',
          _id: question._id,
          content: question.content,
          user: {
            _id: question.user_id,
            name: user.name,
            avatar_url: user.avatar_url,
          }
        })
        const answers = question.help_answer_list;
        for (const answer of answers) {
          const { data: user } = await api.getUserInfo(answer.user_id);
          comments.push({
            type: 'answer',
            _id: answer._id,
            content: answer.content,
            user: {
              _id: answer.user_id,
              name: user.name,
              avatar_url: user.avatar_url,
            }
          })
        }
      }
      this.setData({
        comments: comments,
      })
    },
    async sendQuestion(content) {
      console.log(this.properties)
      const resp = await HelpCommentAPI.createHelpQuestion(this.properties.help._id, content);
      if (resp.isError) {
        await wx.showToast({
          title: '发送失败',
          icon: 'error',
          mask: true,
        })
        return;
      }
      await this.fetchComments();
    },
    async sendAnswer(content, to) {
      const question = to.type === 'answer' ? this.findQuestionByAnswer(to) : to;
      const resp = await HelpCommentAPI.createHelpAnswer(this.properties.help._id, question._id, content);
      if (resp.isError) {
        await wx.showToast({
          title: '发送失败',
          icon: 'error',
          mask: true,
        })
        return;
      }
      await this.fetchComments();
    },
    findQuestionByAnswer(answer) {
      const { comments } = this.data;
      const aIdx = comments.findIndex(c => c._id === answer._id);
      for (let i = aIdx; i >= 0; i--) {
        if (comments[i].type === 'question') {
          return comments[i];
        }
      }
    },
    async openMyProfile() {
      ensureRegistered();
      await openProfile(app.globalData.self);
    },
    async openProfile(ev) {
      const { user } = ev.currentTarget.dataset.comment;
      await openProfile(user);
    },
    onStartComment({ currentTarget: { dataset: { comment } } }) {
      ensureRegistered();
      this.setData({
        commenting: true,
        commentingTo: comment, // 如果是回复则有这个字段
      })
    },
    async onLongPress({ currentTarget: { dataset: { comment } } }) {
      const options = [];
      options.push({
        text: '复制',
        action: 'copy',
      });
      if (comment.user._id === app.globalData.self?._id) {
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
          content: '确认删除此条留言',
        });
        if (!confirm) {
          return;
        }
        if (comment.type === 'question') {
          await HelpCommentAPI.delHelpQuestion(comment._id);
        } else {
          await HelpCommentAPI.deleteHelpAnswer(comment._id);
        }
        await this.fetchComments();
      }
    },
    onPopupInput(ev) {
      this.setData({ commentingText: ev.detail.value });
    },
    async onConfirmComment() {
      const { commentingText, commentingTo } = this.data;
      const text = commentingText.trim();
      if (text) {
        if (commentingTo) {
          this.sendAnswer(text, commentingTo).then();
        } else {
          this.sendQuestion(text).then();
        }
      }
      this.onEndComment();
    },
    onEndComment() {
      this.setData({
        commenting: false,
        commentingTo: null,
        commentingText: '',
      })
    },
  }
})