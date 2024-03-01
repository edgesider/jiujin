export const COMMODITY_STATUS_SELLING = 0; // 出售中
export const COMMODITY_STATUS_OFF = 1; // 已下架
export const COMMODITY_STATUS_SOLD = 2; // 已售出

export const GENDER = {
  UNKNOWN: 0,
  MALE: 1,
  FEMALE: 2,
}

const constants = {};

export default function getConstants() {
  return {
    COMMODITY_STATUS_SELLING,
    COMMODITY_STATUS_OFF,
    COMMODITY_STATUS_SOLD,
    GENDER,
    ...constants
  };
};

export function setConstants(obj) {
  Object.assign(constants, obj);
}