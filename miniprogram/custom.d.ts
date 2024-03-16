import TencentCloudChat, { ChatSDK } from '@tencentcloud/chat';

declare global {
  const wx: {
    chat: ChatSDK & typeof TencentCloudChat;
  }
}