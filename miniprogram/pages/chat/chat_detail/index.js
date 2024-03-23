Page({
  data: {
    conversationId: null,
    unreadCount: 0,
  },
  onLoad: function (options) {
    console.log('options', options);
    const { conversationId, unreadCount } = options;
    this.setData({
      conversationId,
      unreadCount: parseInt(unreadCount) ?? 0,
    });
  }
});