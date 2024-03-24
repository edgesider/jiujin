import { TransactionFinishReason, TransactionStatus } from "./api/transaction";

export const COMMODITY_STATUS_SELLING = 0; // 出售中
export const COMMODITY_STATUS_DEACTIVATED = 1; // 已下架
export const COMMODITY_STATUS_SOLD = 2; // 已售出
export const COMMODITY_STATUS_BOOKED = 3; // 已锁定

export const DEFAULT_AVATAR = 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132';

export const GENDER = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
}

export const GENDER_NAME_MAP = {
  [GENDER.MALE]: '男',
  [GENDER.FEMALE]: '女',
  [GENDER.UNKNOWN]: '未知',
}

const constants = {
  COMMODITY_STATUS_SELLING,
  COMMODITY_STATUS_DEACTIVATED,
  COMMODITY_STATUS_SOLD,
  COMMODITY_STATUS_BOOKED,
  CustomBar: 0,
  StatusBar: 0,
  GENDER, GENDER_NAME_MAP,
  DEFAULT_AVATAR,
  TransactionStatus,
  TransactionFinishReason,
};

export default function getConstants() {
  return { ...constants };
};

export function setConstants(obj) {
  Object.assign(constants, obj);
}