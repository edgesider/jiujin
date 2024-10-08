import { TransactionFinishReason, TransactionStatus } from './api/TransactionAPI';
import { HelpTransactionFinishReason, HelpTransactionStatus } from './api/HelpTransactionAPI';
import { MessageStatus, MessageType, SessionType } from './lib/openim/index';
import { VerifyStatus } from './api/verify';
import { EntityType } from './types';
import { NotifyType } from './utils/notify';
import { isInSingleMode } from './utils/globals';
import { DialogType } from './utils/router';

export const COMMODITY_STATUS_SELLING = 0; // 出售中
export const COMMODITY_STATUS_DEACTIVATED = 1; // 已下架
export const COMMODITY_STATUS_SOLD = 2; // 已售出
export const COMMODITY_STATUS_BOOKED = 3; // 已锁定
export const COMMODITY_STATUS_REPORTED = 4; // 被举报


export const HELP_STATUS_RUNNING = 0; // 运行中
export const HELP_STATUS_FINISHED = 1; // 已结束
export const HELP_STATUS_RESOLVED = 2; // 已解决
export const HELP_STATUS_RESOLVING = 3; // 解决中
export const HELP_STATUS_REPORTED = 4; // 被举报

export const HELP_POLISH_MIN_DURATION = 1000 * 60 * 60 * 3;
export const COMMODITY_POLISH_MIN_DURATION = 1000 * 60 * 60 * 24 * 2;

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

export enum SceneType {
  SinglePage = 1154, // 单页模式（朋友圈）
}

function initConstants() {
  const menuBtn = wx.getMenuButtonBoundingClientRect();
  const systemInfo = wx.getSystemInfoSync();
  const platform = systemInfo.platform;
  // 系统状态栏高度
  const StatusBar = systemInfo.statusBarHeight;
  // 自定义顶栏高度
  const CustomBar = (menuBtn.top - systemInfo.statusBarHeight) * 2 + menuBtn.height;
  // 底部导航栏高度
  const TabBarHeight = 60;
  // 底部指示器高度（小白条）
  const BottomIndicatorHeight =
    platform === 'ios' || platform === 'devtools'
      ? 14 // ios 获取到的的小白条高度有点高（34），这里直接写死14
      : systemInfo.safeArea ? (systemInfo.screenHeight - systemInfo.safeArea?.bottom ?? 0) : 0;

  const { scene } = wx.getLaunchOptionsSync();
  console.log(`scene = ${scene}`);
  return {
    StatusBar,
    CustomBar,
    TabBarHeight,
    MenuButton: menuBtn,
    ScreenSize: [systemInfo.screenWidth, systemInfo.screenHeight],
    SafeArea: systemInfo.safeArea,
    TopBarHeight: StatusBar + CustomBar,
    BottomBarHeight: BottomIndicatorHeight + TabBarHeight,
    BottomIndicatorHeight,
    Platform: platform as 'ios' | 'android' | 'devtools',
    Scene: scene,
    SinglePageMode: scene === SceneType.SinglePage,

    // im
    MessageType,
    SessionType,
    MessageStatus,
  };
}

const constants = {
  COMMODITY_STATUS_SELLING,
  COMMODITY_STATUS_DEACTIVATED,
  COMMODITY_STATUS_SOLD,
  COMMODITY_STATUS_BOOKED,
  COMMODITY_STATUS_REPORTED,
  HELP_STATUS_RUNNING,
  HELP_STATUS_RESOLVED,
  HELP_STATUS_FINISHED,
  HELP_STATUS_RESOLVING,
  HELP_STATUS_REPORTED,
  HELP_POLISH_MIN_DURATION,
  COMMODITY_POLISH_MIN_DURATION,
  GENDER, GENDER_NAME_MAP,
  DEFAULT_AVATAR,
  TransactionStatus,
  TransactionFinishReason,
  HelpTransactionStatus,
  HelpTransactionFinishReason,
  VerifyStatus,
  ...initConstants(),
  EntityType,
  NotifyType,
  DialogType,
};

export default function getConstants() {
  return constants;
};

/**
 * 设置一些在wxml中也可以用的常量
 * @param obj
 */
export function setConstants(obj: Record<string, any>) {
  Object.assign(constants, obj);
}