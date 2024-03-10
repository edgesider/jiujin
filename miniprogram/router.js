export async function openProfile(user) {
  if (typeof user === 'object') {
    user = user._id;
  }
  await wx.navigateTo({
    url: `/pages/profile/index?user_id=${user}`,
  });
}