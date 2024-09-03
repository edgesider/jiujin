import { Commodity, Help } from '../types';
import { COMMODITY_POLISH_MIN_DURATION, HELP_POLISH_MIN_DURATION } from '../constants';

export const EntityUtils = {
  canFreePolish({ commodity, help }: {
    commodity?: Commodity,
    help?: Help,
  }): boolean {
    if (commodity) {
      return commodity.create_time === commodity.polish_time // 新创建的
        || commodity.polish_time + COMMODITY_POLISH_MIN_DURATION < Date.now(); // 擦亮倒计时已结束
    } else if (help) {
      return help.create_time === help.polish_time // 新创建的
        || help.polish_time + HELP_POLISH_MIN_DURATION < Date.now(); // 擦亮倒计时已结束
    } else {
      throw Error('both commodity and help is null');
    }
  }
}