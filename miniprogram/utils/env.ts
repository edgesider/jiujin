const info = wx.getAccountInfoSync();

export function getVersionInfo() {
  return info.miniProgram;
}

export function getEnvVersion() {
  return info.miniProgram.envVersion;
}

export function isReleaseVersion() {
  return getEnvVersion() === 'release';
}