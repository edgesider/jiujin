export enum NotifyType {
  BookingRequest = 'QMlQmIOyZo90Tc9stZYHO8a8tWuG4J6jK8PI4hGy5MQ',
  BookingAgreed = 'w_NyXTO4HoEMU3kY4u3ngfPnBnwYQ8eQ9iJykU19-Lg',
  Chat = 'Y690e4bn__l8hqMEj5bCejjnFvjeJ5wPgzLB6W-l5Sc',
}

export async function requestNotifySubscribe(
  types: NotifyType[]
): Promise<Boolean> {
  const res = await wx.requestSubscribeMessage({ tmplIds: types });
  console.warn(res);
  return true;
}

export type NotifySwitchState = {
  [type in NotifyType]?: boolean;
} & {
  mainSwitch: boolean;
};

export async function getNotifySwitches(): Promise<NotifySwitchState> {
  const res = await wx.getSetting({ withSubscriptions: true, });
  return {
    mainSwitch: res.subscriptionsSetting.mainSwitch,
    ...res.subscriptionsSetting.itemSettings,
  };
}