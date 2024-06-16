import { tryJsonParse } from './other';
import { getOpenId } from '../api/api';
import { Commodity, Help } from '../types';
import { drawCommodityShareImage, drawHelpShareImage } from './canvas';
import { metric } from './metric';

type IShareAppMessageOption = WechatMiniprogram.Page.IShareAppMessageOption;

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

export interface InviteActivityShareInfo extends BaseShareInfo {
  type: 'invite_activity';
}

export type ShareInfo =
  | AppShareInfo
  | CommodityShareInfo
  | HelpShareInfo
  | InviteActivityShareInfo
  ;

export function buildShareParam(shareInfo: ShareInfo): string {
  metric.write('share_click', shareInfo);
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

export async function onShareApp(options: IShareAppMessageOption) {
  const shareInfo = buildShareParam({
    type: 'app',
    from: options.from,
    fromUid: getOpenId(),
    timestamp: Date.now(),
    method: 'card',
  });
  const page = getCurrentPages()[0];
  const path = `${page.route.split('?')[0]}?shareInfo=${encodeURIComponent(shareInfo)}`;
  return {
    title: '我发现一个有趣的小程序，快来看看吧！',
    path,
  };
}

export async function onShareCommodity(options: IShareAppMessageOption, commodity: Commodity) {
  const shareInfo = buildShareParam({
    type: 'commodity',
    from: options.from,
    commodityId: commodity._id,
    fromUid: getOpenId(),
    timestamp: Date.now(),
    method: 'card'
  });
  const path = await drawCommodityShareImage(commodity);
  return {
    title: '闲置 | ' + commodity.content,
    path: '/pages/commodity_detail/index' +
      `?id=${commodity._id}` +
      `&shareInfo=${encodeURIComponent(shareInfo)}`,
    imageUrl: path,
  }

}

export async function onShareHelp(options: IShareAppMessageOption, help_?: Help) {
  const help = help_ || options.target.dataset.help as Help | undefined;
  if (!help) {
    return onShareApp(options);
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
    title: '互助 | ' + help.content,
    path: '/pages/help_detail/index' +
      `?id=${help._id}` +
      `&shareInfo=${encodeURIComponent(shareInfo)}`,
    imageUrl: await drawHelpShareImage(help),
  };
}

export function onShareInviteActivity(options: IShareAppMessageOption) {
  const shareInfo = buildShareParam({
    type: 'invite_activity',
    from: options.from,
    fromUid: getOpenId(),
    timestamp: Date.now(),
    method: 'card',
  });
  return {
    title: '邀同学分万元红包',
    path: `/pages/invite_activity/index?shareInfo=${encodeURIComponent(shareInfo)}`,
  };
}