export enum NotifyType {
  CommodityChat = 'Y690e4bn__l8hqMEj5bCejjnFvjeJ5wPgzLB6W-l5Sc',
  HelpChat = 'xxgi6jsrFygWbALoLlnPfeV-_h5slR8QLg2LpjRFD60',
}

const prompts = {
  [NotifyType.CommodityChat]: '为更快达成交易，我们将在您收到私聊时向您发送通知，请在“订阅消息”设置中允许通知',
  [NotifyType.HelpChat]: '为更快达成交易，我们将在您收到私聊时向您发送通知，请在“订阅消息”设置中允许通知',
}

export async function requestNotifySubscribe(
  types: NotifyType[]
): Promise<Boolean> {
  try {
    const res = await wx.requestSubscribeMessage({ tmplIds: types });
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

export async function checkNotifySettingAndRequest(type: NotifyType): Promise<boolean> {
  syncNotifySwitches().then();
  if (switches[type] !== 'accept') {
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