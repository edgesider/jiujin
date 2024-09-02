import { Commodity } from '../types';
import { COMMODITY_POLISH_MIN_DURATION } from '../constants';

export const CommodityUtils = {
  canFreePolish(co: Commodity): boolean {
    return co.create_time === co.polish_time // 新创建的
      || co.polish_time + COMMODITY_POLISH_MIN_DURATION < Date.now(); // 擦亮倒计时已结束
  }
}