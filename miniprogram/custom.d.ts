import TencentCloudChat, { ChatSDK } from '@tencentcloud/chat';

declare global {
  const wx: {
    $TUIKit: ChatSDK;
    TencentCloudChat: typeof TencentCloudChat;
  }
}