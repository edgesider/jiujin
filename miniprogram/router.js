export async function openProfile(user) {
  if (typeof user === 'object') {
    user = user._id;
  }
  await wx.navigateTo({
    url: `../profile/index?user_id=${user}`,
  });
}