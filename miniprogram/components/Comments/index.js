import { CommentAPI } from '../../api/api';
import { openProfile } from "../../router";

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
    },
  },
  data: {
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
  },
  methods: {
    nop() {},
    async fetchComments() {
      const comments = [];
      const questions = await CommentAPI.getQuestions(this.properties.commodity._id, 0, 10)
      if (questions.isError) {
        return;
      }
      for (const question of questions.data) {
        if (!question.userInfoList || question.userInfoList.length === 0 || question.userInfoList[0].is_deleted) {
          // 用户可能已经注销
          continue;
        }
        comments.push({
          _id: question._id,
          type: 'question',
          user: question.userInfoList?.[0],
          content: question.content,
          createTime: question.create_time,
        })
        const answers = await CommentAPI.getAnswers(question._id, 0, 10)
        if (answers.isError) {
          continue;
        }
        for (const answer of answers.data) {
          if (!answer.userInfoList || answer.userInfoList.length === 0 || answer.userInfoList[0].is_deleted) {
            // 用户可能已经注销
            continue;
          }
          comments.push({
            _id: answer._id,
            qid: answer.question_id,
            type: 'answer',
            user: answer.userInfoList?.[0],
            content: answer.content,
            createTime: answer.create_time,
          })
        }
      }
      this.setData({
        comments: comments,
      })
    },
    async sendQuestion(content) {
      const resp = await CommentAPI.createQuestion(this.properties.commodity._id, content);
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
      const resp = await CommentAPI.createAnswer(question._id, content);
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
      await openProfile(app.globalData.self);
    },
    async openProfile(ev) {
      const { user } = ev.currentTarget.dataset.comment;
      await openProfile(user);
    },
    startComment({ currentTarget: { dataset: { comment } } }) {
      this.setData({
        commenting: true,
        commentingTo: comment, // 如果是回复则有这个字段
      })
    },
    onPopupInput(ev) {
      this.setData({ commentingText: ev.detail.value });
    },
    async confirmComment() {
      const { commentingText, commentingTo } = this.data;
      const text = commentingText.trim();
      if (text) {
        if (commentingTo) {
          this.sendAnswer(text, commentingTo).then();
        } else {
          this.sendQuestion(text).then();
        }
      }
      this.endComment();
    },
    endComment() {
      this.setData({
        commenting: false,
        commentingTo: null,
        commentingText: '',
      })
    },
  }
});
