import { Region, User } from '../types';
import { openLogin, openVerify } from './router';

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

export function setTabBar(page: any, onClick?: () => void) {
  page.getTabBar().updateTo(page.route, onClick);
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从{@param rid}向上找到顶，返回中途的所有区域
 */
export function getRegionPath(rid: number, ridToRegion?: Record<number, Region | undefined>) {
  ridToRegion = (ridToRegion ?? getApp().globalData.ridToRegion ?? {}) as Record<number, Region | undefined>;
  const regionPath: Region[] = [];
  for (
    let region = ridToRegion[rid];
    Boolean(region);
    region = region!.parents[0] ? ridToRegion[region!.parents[0]] : undefined
  ) {
    regionPath.push(region!);
  }
  return regionPath;
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

export function ensureVerified() {
  const self = ensureRegistered();
  if (!self.verify_status) {
    openVerify().then();
    throw Error('not registered');
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
