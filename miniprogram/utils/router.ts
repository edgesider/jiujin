import { Commodity, Help, User } from '../types';
import { Conversation } from '@tencentcloud/chat';
import { ConversationItem } from 'open-im-sdk';

export async function openProfile(user: string | User) {
  if (typeof user === 'object') {
    user = user._id;
  }
  await wx.navigateTo({
    url: `/pages/profile/index?user_id=${user}`,
  });
}

interface CommodityDetailOptions {
  id: string;
  scrollToComment?: boolean;
}

export async function openCommodityDetail(options: CommodityDetailOptions) {
  if (!options.id) {
    throw Error('commodity id is required');
  }
  await wx.navigateTo({
    url: `/pages/commodity_detail/index?id=${options.id}&scrollToComment=${Boolean(options.scrollToComment)}`,
  })
}

export async function openConversationDetail(conv: ConversationItem | string) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  await wx.navigateTo({
    url: `/pages/chat/chat_detail/index?conversationId=${conv}`,
  });
}

export async function openSystemConversationDetail(conv: ConversationItem | string | null, convName: string) {
  if (conv && typeof conv === 'object') {
    conv = conv.conversationID;
  }
  await wx.navigateTo({
    url: `/pages/chat/system_chat_detail/index?conversationId=${conv ?? ''}&convName=${convName}`,
  });
}

export async function openLogin() {
  await wx.navigateTo({
    url: '/pages/login/index',
  });
}

export async function redirectToHome() {
  await wx.reLaunch({
    url: '/pages/home/index'
  });
}

export async function openVerify() {
  await wx.navigateTo({
    url: `/pages/verify/index`
  });
}

export async function openCommodityEdit(commodity: Commodity, waitFinished = false) {
  if (!waitFinished) {
    await wx.navigateTo({
      url: `../commodity_publish/index?commodity=${JSON.stringify(commodity)}&isEdit=1`,
    });
    return;
  } else {
    return new Promise<void>(res => {
      wx.navigateTo({
        url: `../commodity_publish/index?commodity=${JSON.stringify(commodity)}&isEdit=1`,
        events: {
          afterEdited: res
        },
      });
    });
  }
}

interface HelpDetailOptions {
  id: string;
  scrollToComment?: boolean;
}

export async function openHelpDetail(options: HelpDetailOptions) {
  if (!options.id) {
    throw Error('help id is required');
  }
  await wx.navigateTo({
    url: `/pages/help_detail/index?id=${options.id}&scrollToComment=${Boolean(options.scrollToComment)}`,
  })
}

export async function openHelpEdit(help: Help, waitFinished = false) {
  if (!waitFinished) {
    await wx.navigateTo({
      url: `../help_publish/index?help=${JSON.stringify(help)}&isEdit=1`,
    });
    return;
  } else {
    return new Promise<void>(res => {
      wx.navigateTo({
        url: `../help_publish/index?help=${JSON.stringify(help)}&isEdit=1`,
        events: {
          afterEdited: res
        },
      });
    });
  }
}
