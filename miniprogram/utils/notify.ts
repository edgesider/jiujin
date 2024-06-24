import { UserAPI } from '../api/UserAPI';
import { getGlobals, updateSelfInfo } from './globals';

export enum NotifyType {
  Message = 0,
  Comment = 1,
  CommodityChat = 2,
  HelpChat = 3,
}

const prompts = {
  [NotifyType.Message]: '为更快达成交易，我们将在您收到私聊时向您发送通知，请在“订阅消息”设置中允许通知',
  [NotifyType.Comment]: '为更快达成交易，我们将在您收到评论时向您发送通知，请在“订阅消息”设置中允许通知',
}

export interface NotifySubscribeState {
  type: NotifyType;
  name: string;
  prompt: string;
  tmpId: string;
  state: undefined | 'accept' | 'reject' | 'ban';
  count: number;
}

export type NotifySubscribeStates = { [type in NotifyType]: NotifySubscribeState };
const states: NotifySubscribeStates = {
  [NotifyType.Message]: {
    type: NotifyType.Message,
    name: '私聊',
    prompt: '',
    tmpId: '5sRWB8VfznDEREza9aPSy4mPeS_xPyTYmaMt38gvqFc',
    state: undefined,
    count: 0,
  },
  [NotifyType.Comment]: {
    type: NotifyType.Comment,
    name: '评论',
    prompt: '',
    tmpId: 'BiNOMg_tomsLL8p5tYjwLb4dcSRSidFcZ6vwkrhTX7k',
    state: undefined,
    count: 0,
  },
  [NotifyType.CommodityChat]: {
    type: NotifyType.CommodityChat,
    name: '闲置私聊',
    prompt: '',
    tmpId: 'Y690e4bn__l8hqMEj5bCejjnFvjeJ5wPgzLB6W-l5Sc',
    state: undefined,
    count: 0,
  },
  [NotifyType.HelpChat]: {
    type: NotifyType.HelpChat,
    name: '互助私聊',
    prompt: '',
    tmpId: 'xxgi6jsrFygWbALoLlnPfeV-_h5slR8QLg2LpjRFD60',
    state: undefined,
    count: 0,
  },
}

const notifyTypes = Object.values(states).map(s => s.type);

function getTmpId(type: NotifyType) {
  return states[type].tmpId;
}

export async function requestNotifySubscribes(types: NotifyType[]): Promise<Boolean> {
  try {
    let time = Date.now();
    const res = await wx.requestSubscribeMessage({
      tmplIds: types.map(getTmpId)
    });
    console.log(`requestNotifySubscribe cost ${Date.now() - time}ms`);
    time = Date.now();
    await Promise.all(types
      .filter(t => res[getTmpId(t)] === 'accept')
      .map(t => UserAPI.addNotifyCount(t))
    )
    await syncNotifyStates();
    console.log(`send to server and sync to client cost ${Date.now() - time}`);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * 获取通知的可发送次数（服务端维护）
 *
 * 调用前尽量更新下self
 */
export function getNotifyCount(type: NotifyType): number {
  const self = getGlobals().self;
  if (!self) {
    return 0;
  }
  if (type === NotifyType.Message) {
    return self.notify_message_count;
  } else if (type === NotifyType.Comment) {
    return self.notify_comment_count;
  }
  return 0;
}

export type NotifySwitches =
  & { [type in NotifyType]?: 'accept' | 'reject' | 'ban'; }
  & { mainSwitch: boolean; };

let switches: NotifySwitches = { mainSwitch: true };

export function getNotifySwitches() {
  return switches;
}

export function getNotifyStates(): NotifySubscribeStates {
  return states;
}

async function syncNotifySwitches(): Promise<NotifySwitches> {
  const res = await wx.getSetting({ withSubscriptions: true, });
  switches = {
    mainSwitch: res.subscriptionsSetting.mainSwitch,
    ...res.subscriptionsSetting.itemSettings,
  };
  return switches;
}

async function syncNotifyCount() {
  await updateSelfInfo();
  for (const type of notifyTypes) {
    states[type].count = getNotifyCount(type);
  }
}

export async function syncNotifyStates() {
  await Promise.all([syncNotifySwitches(), syncNotifyCount()]);
  return states;
}

export async function checkNotifySettingAndRequest(type: NotifyType): Promise<boolean> {
  syncNotifySwitches().then();
  if (switches[getTmpId(type)] !== 'accept') {
    wx.showModal({
      content: prompts[type] ?? '请求授权通知',
      success: () => {
        wx.openSetting();
      }
    })
    return false;
  } else {
    await requestNotifySubscribes([type]);
    return true;
  }
}