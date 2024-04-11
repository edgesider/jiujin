import { tryJsonParse } from './other';
import { getOpenId } from '../api/api';

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

export type ShareInfo =
  | AppShareInfo
  | CommodityShareInfo
  ;

export function buildShareParam(shareInfo: ShareInfo): string {
  return JSON.stringify(shareInfo);
}

export function parseShareInfo(info: string | undefined | null): ShareInfo | null {
  if (!info) {
    return null;
  }
  return tryJsonParse(info);
}

export async function reportShareInfo(shareInfo: ShareInfo) {
  const data = {
    ...shareInfo,
    reachedUser: getOpenId(),
  }
  console.log(data);
}