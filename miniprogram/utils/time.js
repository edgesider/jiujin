export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 将毫秒数拆解为 天/小时/分钟/秒/毫秒
 *
 * 例如：splitMilliseconds(10000000) -> [0,40,46,2,0]，即：0天+2小时+46分钟+40秒+0毫秒
 *
 * @param ms 需要拆解的毫秒数
 * @return [毫秒, 秒, 分钟, 小时, 天]
 */
export function splitMilliseconds(ms) {
  const dividers = [
    /* 毫秒每天 */ 1000 * 60 * 60 * 24,
    /* 毫秒每小时 */ 1000 * 60 * 60,
    /* 毫秒每分 */ 1000 * 60,
    /* 毫秒每秒 */ 1000,
    /* 毫秒每毫秒 */ 1,
  ];
  const res = [];
  for (const div of dividers) {
    res.push(parseInt((ms / div).toString()));
    ms = ms % div;
  }
  return res.reverse();
}

/**
 * 将毫秒数拆解为 XX天XX小时XX分钟XX秒
 *
 * 例如：splitMillisecondsToString(10000000) -> "0天02:46:40"
 *
 * @param ms 毫秒级的时间戳
 * @param hideZeroDay 0天的时候是否隐藏天，例如："0天02:46:40"会变成"02:46:40"
 * @return 'XX天XX小时XX分钟XX秒'
 */
export function splitMillisecondsToString(ms, hideZeroDay) {
  const div = splitMilliseconds(ms);
  return ((div[4] === 0 && hideZeroDay) ? '' : `${div[4]}天`) +
    `${div[3].toString().padStart(2, '0')}` +
    `:${div[2].toString().padStart(2, '0')}`;
    // `:${div[1].toString().padStart(2, '0')}`;
}
