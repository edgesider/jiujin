import TencentCloudChat, { ChatSDK } from '@tencentcloud/chat';

declare namespace WechatMiniprogram {
  interface Wx {
    chat: ChatSDK & typeof TencentCloudChat;
  }
}

// declare module 'wechat-miniprogram' {
//
//   let a: Wx
// }

declare global {
  let tim: ChatSDK & typeof TencentCloudChat;
}
// export interface Wx {
//   chat: ChatSDK & typeof TencentCloudChat;
// }
//
// declare module 'wechat-miniprogram' {
//   namespace WechatMiniprogram {
//     export interface Wx {
//       chat: ChatSDK & typeof TencentCloudChat;
//     }
//   }
// }