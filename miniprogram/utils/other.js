export function tryJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

export function setTabBar(page) {
  page.getTabBar().updateTo(page.route)
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 从{@param rid}向上找到顶，返回中途的所有区域
 */
export function getRegionPath(rid, ridToRegion = undefined) {
  ridToRegion = ridToRegion ?? getApp().globalData.ridToRegion;
  const regionPath = [];
  for (
    let region = ridToRegion[rid];
    Boolean(region);
    region = region.parents[0] ? ridToRegion[region.parents[0]] : null
  ) {
    regionPath.push(region);
  }
  return regionPath;
}

export function ensureRegistered() {
  if (!getApp().globalData.self) {
    wx.navigateTo({
      url: '/pages/register/index',
    })
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