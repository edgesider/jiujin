import { User } from '../types';
import { Conversation } from '@tencentcloud/chat';

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

export async function openConversationDetail(conv: Conversation | string) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  await wx.navigateTo({
    url: `/pages/chat/chat_detail/index?conversationId=${conv}`,
  });
}

export async function openSystemConversationDetail(conv: Conversation | string | null, convName: string) {
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