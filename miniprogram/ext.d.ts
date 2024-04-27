import TencentCloudChat, { ChatSDK } from '@tencentcloud/chat';

declare global {
  let tim: ChatSDK & typeof TencentCloudChat;
}