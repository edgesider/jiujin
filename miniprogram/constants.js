import { TransactionFinishReason, TransactionStatus } from "./api/transaction";
import { MessageStatus, MessageType, SessionType } from "open-im-sdk";

export const COMMODITY_STATUS_SELLING = 0; // 出售中
export const COMMODITY_STATUS_DEACTIVATED = 1; // 已下架
export const COMMODITY_STATUS_SOLD = 2; // 已售出
export const COMMODITY_STATUS_BOOKED = 3; // 已锁定


export const HELP_STATUS_RUNNING = 0; // 运行中
export const HELP_STATUS_FINISHED = 1; // 已结束


export const DEFAULT_AVATAR = 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132';
export const DEFAULT_REGION_ID = 6

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

export function initConstants() {
  wx.getSystemInfo({
    success: e => {
      const menuBtn = wx.getMenuButtonBoundingClientRect();
      const { platform } = wx.getSystemInfoSync();
      // 系统状态栏高度
      const StatusBar = e.statusBarHeight;
      // 自定义顶栏高度
      const CustomBar = (menuBtn.top - e.statusBarHeight) * 2 + menuBtn.height;
      // 底部导航栏高度

      const TabBarHeight = 60;
      // 底部指示器高度（小白条）
      const BottomIndicatorHeight =
        platform === 'ios' || platform === 'devtools'
          ? 14 // ios 获取到的的小白条高度有点高（34），这里直接写死14
          : e.safeArea ? (e.screenHeight - e.safeArea?.bottom ?? 0) : 0;
      const constants = Object.freeze({
        StatusBar,
        CustomBar,
        TabBarHeight,
        MenuButton: menuBtn,
        ScreenSize: [e.screenWidth, e.screenHeight],
        SafeArea: e.safeArea,
        TopBarHeight: StatusBar + CustomBar,
        BottomBarHeight: BottomIndicatorHeight + TabBarHeight,
        BottomIndicatorHeight,
        Platform: platform, // ios | android | devtools

        // im
        MessageType,
        SessionType,
        MessageStatus,
      });
      setConstants(constants)
    }
  })
}

export default function getConstants() {
  return { ...constants };
};

/**
 * 设置一些在wxml中也可以用的常量
 * @param obj
 */
export function setConstants(obj) {
  Object.assign(constants, obj);
}