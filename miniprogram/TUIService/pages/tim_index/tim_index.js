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
      var user_id = decodeURIComponent(options.id);
      var conversation = TUIKit.selectComponent('#TUIConversation');
      conversation.searchUserID({ detail: { searchUserID: user_id } });
    }
  },

  async isUserExists(id) {
    resp = await wx.$TUIKit.getUserStatus({ userIDList: [`${id}`] });
    const { users } = imResponse.data;
    const { userID, statusType, customStatus } = users[0];
    if (statusType === wx.TencentCloudChat.TYPES.USER_STATUS_ONLINE || statusType === wx.TencentCloudChat.TYPES.USER_STATUS_OFFLINE)
      return true;
    return false;
  },
});