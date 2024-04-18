import { Region } from '../types';
import { openLogin } from './router';

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

export function ensureRegistered() {
  if (!getApp().globalData.self) {
    openLogin().then();
    throw Error('not registered');
  }
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
