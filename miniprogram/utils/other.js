export function tryJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}