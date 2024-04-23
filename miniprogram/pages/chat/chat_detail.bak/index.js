Page({
  data: {
    conversationId: null,
    unreadCount: 0,
  },
  onLoad: function (options) {
    const { conversationId, unreadCount } = options;
    this.setData({
      conversationId,
      unreadCount: parseInt(unreadCount) ?? 0,
    });
  },
  onShow() {
    this.selectComponent('#TUIChat').updateTransaction();
  },
});