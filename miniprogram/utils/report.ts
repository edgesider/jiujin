import { ensureRegistered } from './other';
import { HelpAPI } from '../api/HelpAPI';
import { CommodityAPI } from '../api/CommodityAPI';

const reasons = ['广告营销', '色情营销', '侵犯个人隐私 ', '辱骂诽谤他人', '虚假冒充', '其他'];

export async function reportHelp(helpId: string): Promise<boolean> {
  ensureRegistered();
  const res = await wx.showActionSheet({ itemList: reasons });
  const selectedReason = reasons[res.tapIndex];
  const resp = await HelpAPI.report(helpId, selectedReason);
  if (resp.isError) {
    await wx.showToast({
      icon: 'error',
      title: '网络错误'
    });
    return false;
  } else {
    await wx.showToast({
      title: '举报成功',
      icon: 'success',
      duration: 2000,
    });
    return true;
  }
}
export async function reportCommodity(commodityId: string): Promise<boolean> {
  ensureRegistered();
  const res = await wx.showActionSheet({ itemList: reasons });
  const selectedReason = reasons[res.tapIndex];
  const resp = await CommodityAPI.report(commodityId, selectedReason);
  if (resp.isError) {
    await wx.showToast({
      icon: 'error',
      title: '网络错误'
    });
    return false;
  } else {
    await wx.showToast({
      title: '举报成功',
      icon: 'success',
      duration: 2000,
    });
    return true;
  }
}
