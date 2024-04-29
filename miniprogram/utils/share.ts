import { tryJsonParse } from './other';
import { getOpenId } from '../api/api';
import IShareAppMessageOption = WechatMiniprogram.Page.IShareAppMessageOption;

export interface BaseShareInfo {
  /**
   * 触发来源
   *
   * See {@link IShareAppMessageOption.from}
   */
  from: 'button' | 'menu' | string;
  fromUid: string;
  timestamp: number;
  method: 'card' | 'qrcode';
}

export interface AppShareInfo extends BaseShareInfo {
  type: 'app';
}

export interface CommodityShareInfo extends BaseShareInfo {
  type: 'commodity';
  commodityId: string;
}

export interface HelpShareInfo extends BaseShareInfo {
  type: 'help';
  helpId: string;
}

export type ShareInfo =
  | AppShareInfo
  | CommodityShareInfo
  | HelpShareInfo
  ;

export function buildShareParam(shareInfo: ShareInfo): string {
  return JSON.stringify(shareInfo);
}

export function parseShareInfo(info: string | undefined | null): ShareInfo | null {
  if (!info) {
    return null;
  }
  let res = tryJsonParse(info);
  if (!res) {
    try {
      res = tryJsonParse(decodeURIComponent(info)); // 低版本的系统上，onLoad里面的内容可能未被decode
    } catch (e) {}
  }
  return res;
}

function saveLastEnterByShareInfo(shareInfo: ShareInfo) {
  wx.setStorageSync('lastShareInfo', shareInfo);
}

/**
 * 获取上次通过分享进入小程序的信息
 */
export function getLastEnterByShareInfo(): ShareInfo | undefined {
  const res = wx.getStorageSync<ShareInfo>('lastShareInfo');
  if (!res) {
    return undefined;
  }
  if (Date.now() - res.timestamp > 10 * 24 * 60 * 60 * 1000) {
    wx.setStorageSync('lastShareInfo', null);
    return undefined;
  }
  return res;
}

export async function reportShareInfo(shareInfo: ShareInfo) {
  const data = {
    ...shareInfo,
    reachedUser: getOpenId(),
  }
  if (shareInfo.fromUid !== getOpenId()) {
    saveLastEnterByShareInfo(shareInfo);
  }
}

export function onShareHelp(options: IShareAppMessageOption) {
  const help = options.target.dataset.help;
  if (!help) {
    throw Error('invalid help share')
  }
  const shareInfo = buildShareParam({
    type: 'help',
    from: options.from,
    fromUid: getOpenId(),
    timestamp: Date.now(),
    method: 'card',
    helpId: help._id,
  });
  return {
    title: '我发现一个有趣的帖子，快来看看吧！',
    path: '/pages/help_detail/index' +
      `?id=${help._id}` +
      `&shareInfo=${encodeURIComponent(shareInfo)}`,
    imageUrl: help.img_urls[0] ?? '' // TODO 无图的
  }
}