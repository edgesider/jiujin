import { Region, User } from '../types';
import { openLogin, openNotVerifyDialog, openVerify } from './router';
import { Observable, Subject } from 'rxjs';
import { VerifyStatus } from '../api/verify';
import Identicon from './randomAvatar';
import { decode } from 'base64-arraybuffer';
import api, { getOpenId } from '../api/api';
import { isInSingleMode } from './globals';

type OnKeyboardHeightChangeCallbackResult = WechatMiniprogram.OnKeyboardHeightChangeCallbackResult;

export function tryJsonParse<T = any>(str: string | undefined | null, defaultValue: T | null = null): T | null {
  if (!str) {
    return defaultValue;
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    return defaultValue
  }
}

export function getCurrentPage() {
  return getCurrentPages().reverse()[0];
}

export function setTabBar(page: any, onClick?: () => void) {
  if (isInSingleMode()) {
    return;
  }
  page.getTabBar().updateTo(page.route, onClick);
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从{@param rid}向上找到顶，返回中途的所有区域
 */
export function getRegionPath(rid: number, {
  ridToRegion,
  maxLevel = Infinity,
  minLevel = -1,
}: {
  ridToRegion?: Record<number, Region | undefined>;
  maxLevel?: number;
  minLevel?: number;
} = {}): Region[] {
  ridToRegion = (ridToRegion ?? getApp().globalData.ridToRegion ?? {}) as Record<number, Region | undefined>;
  const regionPath: Region[] = [];
  for (
    let region = ridToRegion[rid];
    Boolean(region);
    region = region!.parents[0] ? ridToRegion[region!.parents[0]] : undefined
  ) {
    if (region!.level > maxLevel || region!.level < minLevel) {
      break;
    }
    regionPath.push(region!);
  }
  return regionPath;
}

/**
 * @return 学院路/大运村/1公寓
 */
export function getRegionPathName(rid: number, minLevel = 2, short = false) {
  return getRegionPath(rid, { minLevel })
    .map(r => short ? r.short_name : r.name)
    .reverse().join('/')
}

export function getL1Regions(ridToRegion?: Record<number, Region | undefined>): Region[] {
  ridToRegion = (ridToRegion ?? getApp().globalData.ridToRegion ?? {}) as Record<number, Region | undefined>;
  return Object.values(ridToRegion)
    .filter(region => region?.level === 1)
    .filter((r): r is Region => Boolean(r));
}

/**
 * 获取以某个rid为父区域的所有rid，只包含一级，不会递归往下找
 */
export function getRegionsByParent(parentRid: number, ridToRegion?: Record<number, Region | undefined>): Region[] {
  ridToRegion = (ridToRegion ?? getApp().globalData.ridToRegion ?? {}) as Record<number, Region | undefined>;
  if (!ridToRegion) {
    return [];
  }
  return ridToRegion[parentRid]!!.children
    .map(rid => ridToRegion!![rid])
    .filter((r): r is Region => Boolean(r));
}

export function ensureRegistered(): User {
  const user = getApp().globalData.self;
  if (!user) {
    openLogin().then();
    throw Error('not registered');
  }
  return user;
}

export async function ensureVerified(openDialog = true) {
  await getApp().fetchSelfInfo();
  const self = ensureRegistered();
  if (self.verify_status === VerifyStatus.NotVerified) {
    if (openDialog) {
      openNotVerifyDialog();
    }
    throw Error('not verified');
  }
  return self;
}

export function ensureVerifiedSync(openDialog = true) {
  const self = ensureRegistered();
  if (self.verify_status === VerifyStatus.NotVerified) {
    if (openDialog) {
      openNotVerifyDialog();
    }
    throw Error('not verified');
  }
  return self;
}

/**
 * 生成UUID（并不是特别可靠）
 */
export function generateUUID() {
  let d = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type AnyFunc = (...args: any) => any;

/**
 * 节流和防抖都是用来限制在一段时间内只执行一次。
 * 不同之处在于：
 *   节流只保留第一次执行，会丢弃后续的执行；
 *   而防抖会丢弃前面的执行，只保留最后一次执行。
 * @param func
 * @param wait
 */
export function throttle<T extends AnyFunc>(func: T, wait: number): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let recentCalled = false;
  return (...args: any) => {
    if (recentCalled) {
      return undefined;
    } else {
      recentCalled = true;
      setTimeout(() => recentCalled = false, wait);
      return func(...args);
    }
  };
}

export function debounce<T extends AnyFunc>(func: T, wait: number): (...args: Parameters<T>) => void {
  let inDebounce = false;
  let lastArgs: Parameters<T> | undefined;
  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (!inDebounce) {
      inDebounce = true;
      setTimeout(() => {
        inDebounce = false;
        // 本次节流结束之后执行，传入最后一次获得的参数
        // @ts-ignore
        func(...lastArgs!);
      }, wait);
    }
  };
}

export function textToPrice(text: string) {
  // 支持空白或者两位小数
  const valid = /^\d*(\.\d{0,2})?$/.test(text);
  if (!valid) {
    return;
  }
  if (!text) {
    return 0;
  }
  let price = parseFloat(text) || 0;
  price = Math.max(Math.min(price, 99999.9), 0)
  return price;
}

export const kbHeightChanged: Observable<OnKeyboardHeightChangeCallbackResult>
  = new Subject<OnKeyboardHeightChangeCallbackResult>();

(() => {
  wx.onKeyboardHeightChange(res => {
    (kbHeightChanged as Subject<OnKeyboardHeightChangeCallbackResult>).next(res);
  });
})();

/**
 * cloud://... -> https://...
 */
export function cloudProtocolToHttp(url: string) {
  return url.replace(/cloud:\/\/[^.]*?\.([^\/]*)(.*)/, 'https://$1.tcb.qcloud.la$2');
}

export function toastSucceed(msg: string, mask = true) {
  wx.showToast({
    title: msg,
    icon: 'success',
    mask
  }).then();
}

export function toastInfo(msg: string, mask = true) {
  wx.showToast({
    title: msg,
    icon: 'none',
    mask
  }).then();
}

export function toastError(msg: string, mask = true) {
  wx.showToast({
    title: msg,
    icon: 'error',
    mask
  }).then();
}

export function toastLoading(msg: string, mask = true) {
  wx.showLoading({ title: msg, mask }).then();
}

export function toastLoadingHide() {
  wx.hideLoading().then();
}

export function generateRandomAvatarAndUpload(): Promise<string> {
  return new Promise((resolve, rej) => {
    const avatarB64 = (new Identicon(Date.now().toString() + Date.now().toString())).toString();
    const avatar = decode(avatarB64);
    const fs = wx.getFileSystemManager();
    fs.writeFile({
      filePath: `${wx.env.USER_DATA_PATH}/generated_avatar_tmp.png`,
      data: avatar,
      encoding: 'binary',
      success: async (res) => {
        if (!res.errMsg.includes('ok')) {
          rej(`failed to write generated avatar ${res.errMsg}`);
          return;
        }
        const resp = await api.uploadImage(
          `${wx.env.USER_DATA_PATH}/generated_avatar_tmp.png`,
          `avatar/${getOpenId()}_${Date.now()}_${Math.random() * 10000000}`
        );
        if (resp.isError || !resp.data) {
          rej(`failed to upload image: ${resp.message}`);
          return;
        }
        resolve(resp.data);
      },
      fail(res) {
        rej(res);
      }
    })
  })
}

export interface UrlObject {
  protocol: string,
  path: string,
  params: Map<string, string>
}

export function parseURL(url: string): UrlObject {
  const result = /^([^:]+):\/\/([^?]*)/.exec(url);
  if (!result) {
    throw Error('invalid url');
  }
  const [prefix, protocol, path] = result;
  const params = url.substring(prefix.length + 1).split('&');
  const paramsMap = new Map<string, string>();
  for (const param of params) {
    const eqPos = param.indexOf('=');
    if (eqPos === -1) {
      paramsMap.set(decodeURIComponent(param), '');
    } else {
      paramsMap.set(
        decodeURIComponent(param.substring(0, eqPos)),
        decodeURIComponent(param.substring(eqPos + 1)),
      );
    }
  }
  return { protocol, path, params: paramsMap };
}

export function assembleUrlObject(u: UrlObject): string {
  const paramStr = [...u.params.entries()]
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${u.protocol}://${u.path}?${paramStr}`;
}

export function getCompressedImageUrl(url: string): string {
  // https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/commodity/o5j6j6_EoDgUMEY6nudpmFfrvLV0_1718272983467_9198324.275033996?t=1718381375778
  const u = parseURL(url);
  if (u.protocol !== 'http' && u.protocol !== 'https') {
    return url;
  }
  if (!u.path.match(/^[^.\/]*\.tcb\.qcloud\.la\//)) {
    return url;
  }
  if (u.path.endsWith('/detail')) {
    return url;
  }
  u.path = `${u.path}/detail`;
  return assembleUrlObject(u);
}

export async function isAddedToMyProgram() {
  return new Promise(res => {
    // @ts-ignore
    wx.checkIsAddedToMyMiniProgram({
      success: result => {
        console.log('check result', result);
        res(Boolean(result?.added))
      }
    });
  })
}