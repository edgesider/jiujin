import { CommentAPI } from '../../api/api';

const app = getApp();

Component({
  properties: {
    commodity: {
      type: Object,
      default: null
    }
  },
  data: {
    input: '',
    selfInfo: null,
    comments: [],
  },
  async attached() {
    this.setData({ selfInfo: app.globalData.self, })
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
    async sendQuestion() {
      const resp = await CommentAPI.createQuestion(this.properties.commodity._id, this.data.input);
      if (resp.isError) {
        await wx.showToast({
          title: '发送失败',
          icon: 'error',
          mask: true,
        })
        return;
      }
      this.setData({ input: '', })
      await this.fetchComments();
    },
  }
});
