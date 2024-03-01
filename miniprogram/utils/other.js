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
