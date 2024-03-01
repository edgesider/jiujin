import { setTabBar } from "../../../utils/other";

const app = getApp();

Page({
  data: {
    pageIndex: 2,
    ridToRegion: null,
    config: {
      // currentConversationID
    }
  },

  async onLoad(options) {
    setTabBar(this);
    await app.waitForReady();

    const TUIKit = this.selectComponent('#TUIKit');
    TUIKit.init();
  },

  async onShow(){
    const { targetCommodity, self } = app.globalData;
    const TUIKit = this.selectComponent('#TUIKit');
    var conversation = TUIKit.selectComponent('#TUIConversation');
    if (targetCommodity){
      // 尝试创建群聊
      const comm_tail = targetCommodity._id.substr(0, 16);
      const group_id = `${self._id}${comm_tail}`;
      console.log(targetCommodity);
      wx.$TUIKit.createGroup({
        type: wx.TencentCloudChat.TYPES.GRP_MEETING,
        name: targetCommodity.content,
        groupID: group_id,
        avatar: targetCommodity.img_urls[0],
        memberList: [
          { userID: 'USER' + self._id },
          { userID: 'USER' + targetCommodity.sell_id }
        ]
      }).then(function(imResponse) {
        console.log("群聊创建成功：" + imResponse.data.group);
        // 进入群聊
        conversation.searchGroupID({ detail: { searchGroupID: "GROUP" + group_id } });
        app.globalData.targetCommodity = null;
      }).catch(function(imError) {
        console.warn('群聊创建失败:', imError);
        app.globalData.targetCommodity = null;
      });
    }
  },

  async isUserExists(id) {
    resp = await wx.$TUIKit.getUserStatus({ userIDList: [`${id}`] });
    const { users } = imResponse.data;
    const { statusType } = users[0];
    if (statusType === wx.TencentCloudChat.TYPES.USER_STATUS_ONLINE || statusType === wx.TencentCloudChat.TYPES.USER_STATUS_OFFLINE)
      return true;
    return false;
  },
});