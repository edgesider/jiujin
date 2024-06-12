const info = wx.getAccountInfoSync();

export function getEnvVersion() {
  return info.miniProgram.envVersion;
}

export function isReleaseVersion() {
  return getEnvVersion() === 'release';
}