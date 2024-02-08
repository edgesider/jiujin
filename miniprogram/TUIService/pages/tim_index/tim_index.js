Page({
  data: {
    config: {
      // currentConversationID
    }
  },

  onLoad(options) {
    const TUIKit = this.selectComponent('#TUIKit');
    TUIKit.init();

    if (options.id){
      var conversation_id = decodeURIComponent(options.id);
      var conversation = TUIKit.selectComponent('#TUIConversation');
      conversation.searchUserID({ detail: { searchUserID: conversation_id } });
    }
  },
});