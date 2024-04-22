export enum NotifyType {
  BookingRequest,
  BookingAgreed,
}

export async function requestNotifySubscribe(
  types: NotifyType[]
): Promise<Boolean> {
  const tmplIds: string[] = types
    .map(type => ({
      [NotifyType.BookingRequest]: 'QMlQmIOyZo90Tc9stZYHO8a8tWuG4J6jK8PI4hGy5MQ',
      [NotifyType.BookingAgreed]: 'w_NyXTO4HoEMU3kY4u3ngfPnBnwYQ8eQ9iJykU19-Lg'
    } as Record<NotifyType, string>)[type])
    .filter(Boolean);
  const res = await wx.requestSubscribeMessage({ tmplIds });
  console.warn(res);
  return true;
}