import { setTabBar } from "../../../utils/other";
import api from "../../../api/api";

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
    if (targetCommodity != null){
      // 尝试创建群聊
      const sell_id = targetCommodity.sell_id;
      const { data: user } = await api.getUserInfo(sell_id);
      const comm_tail = targetCommodity._id.substr(0, 16);
      const group_id = `${self._id}${comm_tail}`;
      try{
        await wx.$TUIKit.createGroup({
          type: wx.TencentCloudChat.TYPES.GRP_MEETING,
          name: user.name,
          groupID: group_id,
          avatar: targetCommodity.img_urls[0],
          memberList: [
            { userID: 'USER' + self._id },
            { userID: 'USER' + targetCommodity.sell_id }
          ]
        });
      }catch (e){}

      console.log('群属性', await wx.$TUIKit.getGroupAttributes({
        groupID: group_id,
        keyList: [ "commodityID", "sellID" ]
      }));
      console.warn(targetCommodity);
      await wx.$TUIKit.setGroupAttributes({
        groupID: group_id,
        groupAttributes: {
          commodityID: targetCommodity._id,
          sellID: targetCommodity.sell_id,
        }
      });

      app.globalData.targetCommodity = null;
      conversation.searchGroupID({ detail: { searchGroupID: "GROUP" + group_id } });
    }
  },
});