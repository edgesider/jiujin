Page({
  data: {
    config: {
      // currentConversationID
    }
  },

  onLoad() {
    const TUIKit = this.selectComponent('#TUIKit');
    TUIKit.init();
  },
});