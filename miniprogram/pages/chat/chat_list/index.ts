import { setTabBar } from "../../../utils/other";
import api from "../../../api/api";
import { getImUidFromUid } from "../integrate";

const app = getApp();

Page({
  data: {
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

  async onShow() {
    const { targetCommodity, self } = app.globalData;
    const TUIKit = this.selectComponent('#TUIKit');
    const conversation = TUIKit.selectComponent('#TUIConversation');
    if (targetCommodity != null) {
      // 尝试创建群聊
      const { data: user } = await api.getUserInfo(targetCommodity.seller_id);
      const comm_tail = targetCommodity._id.substr(0, 16);
      const group_id = `${self._id}${comm_tail}`;
      await tim.createGroup({
        type: tim.TYPES.GRP_MEETING,
        name: user.name,
        groupID: group_id,
        avatar: targetCommodity.img_urls[0],
        memberList: [
          { userID: getImUidFromUid(self._id) },
          { userID: getImUidFromUid(targetCommodity.seller_id) }
        ]
      });

      await tim.setGroupAttributes({
        groupID: group_id,
        groupAttributes: {
          commodityID: targetCommodity._id,
          sellID: targetCommodity.seller_id,
        }
      });

      app.globalData.targetCommodity = null;
      conversation.searchGroupID({ detail: { searchGroupID: "GROUP" + group_id } });
    }
  },
});