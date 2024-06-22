import { Region, User } from '../types';

interface Globals {
  self?: User,
  ridToRegion: Record<number, Region>;
}

export function getGlobals() {
  return getApp().globalData as Globals;
}

export async function waitForAppReady() {
  await getApp().waitForReady();
}

export function isAppReady() {
  return getApp().isReady();
}

export async function updateSelfInfo(): Promise<User | undefined> {
  await getApp().fetchSelfInfo();
  return getGlobals().self;
}