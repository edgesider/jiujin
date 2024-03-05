import { CommentAPI } from '../../api/api';

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
      // const { questionAnswerMap } = await CommentAPI.getCommodityQuestionsAndAnswers(this.properties.commodity._id, 0, 10);
      const questions = await CommentAPI.getCommodityQuestionsAndAnswers(this.properties.commodity._id, 0, 10);
      // for (const question of questionAnswerMap) {
      //   comments.push({
      //     type: 'question',
      //     content: question,
      //   })
      //   const answers = questionAnswerMap[question];
      //   for (const answer of answers) {
      //     comments.push({
      //       type: 'answer',
      //       content: answer,
      //     })
      //   }
      // }
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
