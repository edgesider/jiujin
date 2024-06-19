import { UserAPI } from '../api/UserAPI';

export enum NotifyType {
  Message = 0,
  Comment = 1,
}

export function getNotifyTemplateId(type: NotifyType) {
  return {
    [NotifyType.Message]: '5sRWB8VfznDEREza9aPSy4mPeS_xPyTYmaMt38gvqFc',
    [NotifyType.Comment]: 'BiNOMg_tomsLL8p5tYjwLb4dcSRSidFcZ6vwkrhTX7k',
  }[type];
}

const prompts = {
  [NotifyType.Message]: '为更快达成交易，我们将在您收到私聊时向您发送通知，请在“订阅消息”设置中允许通知',
  [NotifyType.Comment]: '为更快达成交易，我们将在您收到评论时向您发送通知，请在“订阅消息”设置中允许通知',
}

export async function requestNotifySubscribe(
  types: NotifyType[]
): Promise<Boolean> {
  try {
    const res = await wx.requestSubscribeMessage({
      tmplIds: types.map(getNotifyTemplateId)
    });
    for (const type of types) {
      UserAPI.addNotifyCount(type).then();
    }
    console.log(res.errMsg)
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export type NotifySwitchState = {
  [type in NotifyType]?: 'accept' | 'reject';
} & {
  mainSwitch: boolean;
};

let switches: NotifySwitchState = { mainSwitch: true };
syncNotifySwitches().then();

export async function syncNotifySwitches(): Promise<NotifySwitchState> {
  console.log('syncNotifySwitches');
  const res = await wx.getSetting({ withSubscriptions: true, });
  switches = {
    mainSwitch: res.subscriptionsSetting.mainSwitch,
    ...res.subscriptionsSetting.itemSettings,
  };
  return switches;
}

export function getNotifySwitches() {
  return switches;
}

export async function checkNotifySettingAndRequest(type: NotifyType): Promise<boolean> {
  syncNotifySwitches().then();
  if (switches[getNotifyTemplateId(type)] !== 'accept') {
    wx.showModal({
      content: prompts[type] ?? '请求授权通知',
      success: () => {
        wx.openSetting();
      }
    })
    return false;
  } else {
    await requestNotifySubscribe([type]);
    return true;
  }
}