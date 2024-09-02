import { Commodity, Help, User } from '../types';
import { ConversationItem } from '../lib/openim/index';
import { AboutType } from '../pages/about';
import { getCurrentPage, parseURL, toastSucceed } from './other';
import { metric } from './metric';
import { encode } from 'base64-arraybuffer';
import { UsePolishCardDialogParams, UsePolishCardDialogResult } from '../components/UsePolishCardDialog';

export function getRouteFromHomePageUrl(
  targetPageOrSchema: string,
  homeParams: Record<string, any> = {},
) {
  homeParams['routeTo'] = targetPageOrSchema;
  const params = Object.entries(homeParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `/pages/home/index?${params}`;
}

export async function openProfile(user: string | User) {
  if (typeof user === 'object') {
    user = user._id;
  }
  await wx.navigateTo({
    url: `/pages/profile/index?user_id=${user}`,
  });
}

interface CommodityDetailOptions {
  id: string;
  scrollToComment?: boolean;
}

export async function openCommodityDetail(options: CommodityDetailOptions) {
  if (!options.id) {
    throw Error('commodity id is required');
  }
  await wx.navigateTo({
    url: `/pages/commodity_detail/index?id=${options.id}&scrollToComment=${Boolean(options.scrollToComment)}`,
  })
}

export async function openConversationDetail(conv: ConversationItem | string) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  await wx.navigateTo({
    url: `/pages/chat/chat_detail/index?conversationId=${conv}`,
  });
}

export async function openSystemConversationDetail(conv: ConversationItem | string | null, convName: string) {
  if (conv && typeof conv === 'object') {
    conv = conv.conversationID;
  }
  await wx.navigateTo({
    url: `/pages/chat/system_chat_detail/index?conversationId=${conv ?? ''}&convName=${convName}`,
  });
}

export async function openLogin() {
  await wx.navigateTo({
    url: '/pages/login/index',
  });
}

export async function redirectToHome() {
  await wx.reLaunch({
    url: '/pages/home/index'
  });
}

export async function openVerify() {
  await wx.navigateTo({
    url: `/pages/verify/index`
  });
}

export async function openCommodityPublish(from?: Commodity, waitFinished = false) {
  return new Promise<void>(async (res) => {
    await wx.navigateTo({
      url: from ? `../commodity_publish/index?commodity=${encodeURIComponent(JSON.stringify(from))}` : `../commodity_publish/index`,
      events: {
        afterPublished: waitFinished ? res() : undefined
      },
    });
    if (!waitFinished) {
      res();
    }
  });
}

export async function openCommodityEdit(commodity: Commodity, waitFinished = false) {
  if (!waitFinished) {
    await wx.navigateTo({
      url: `/pages/commodity_publish/index?commodity=${encodeURIComponent(JSON.stringify(commodity))}&isEdit=1`,
    });
    return;
  } else {
    return new Promise<void>(res => {
      wx.navigateTo({
        url: `/pages/commodity_publish/index?commodity=${encodeURIComponent(JSON.stringify(commodity))}&isEdit=1`,
        events: {
          afterEdited: res
        },
      });
    });
  }
}

interface HelpDetailOptions {
  id: string;
  scrollToComment?: boolean;
}

export async function openHelpDetail(options: HelpDetailOptions) {
  if (!options.id) {
    throw Error('help id is required');
  }
  await wx.navigateTo({
    url: `/pages/help_detail/index?id=${options.id}&scrollToComment=${Boolean(options.scrollToComment)}`,
  })
}

export async function openHelpPublish(from?: Help, waitFinished = false) {
  return new Promise<void>(async (res) => {
    await wx.navigateTo({
      url: from ? `../help_publish/index?help=${JSON.stringify(from)}` : `../help_publish/index`,
      events: {
        afterPublished: waitFinished ? res() : undefined
      },
    });
    if (!waitFinished) {
      res();
    }
  });
}

export async function openHelpEdit(help: Help, waitFinished = false) {
  if (!waitFinished) {
    await wx.navigateTo({
      url: `/pages/help_publish/index?help=${encodeURIComponent(JSON.stringify(help))}&isEdit=1`,
    });
    return;
  } else {
    return new Promise<void>(res => {
      wx.navigateTo({
        url: `/pages/help_publish/index?help=${encodeURIComponent(JSON.stringify(help))}&isEdit=1`,
        events: {
          afterEdited: res
        },
      });
    });
  }
}

export async function openInviteActivity() {
  await wx.navigateTo({
    url: '/pages/invite_activity/index'
  });
}

export async function openAboutPage(type: AboutType) {
  await wx.navigateTo({
    url: `/pages/about/index?type=${type}`,
  });
}

export async function openWebView(src: string) {
  await wx.navigateTo({
    url: `/pages/webview/index?src=${src}`,
  });
}

export async function handleSchema(schema: string) {
  if (schema.startsWith('lllw://')) {
    const url = parseURL(schema);
    if (url.path === 'route') {
      const type = url.params.get('type');
      const page = url.params.get('page');
      if (page) {
        await wx.navigateTo({ url: page });
      } else if (type) {
        switch (type) {
          case 'setting':
            await wx.openSetting();
            break;
        }
      }
    } else {
      metric.write('unknown_schema', {}, { schema });
      console.error(`unhandled schema ${url.path}`);
    }
  } else if (schema.startsWith('/pages')) {
    await wx.navigateTo({ url: schema });
  } else {
    metric.write('unknown_schema', {}, { schema });
    console.error(`unhandled schema ${schema}`);
  }
}

export async function handleLink(link: string) {
  if (link.match(/^(http|https):\/\/([^\/]*\.)?lllw.cc/)) {
    await openWebView(link);
  } else {
    await wx.setClipboardData({ data: link });
    toastSucceed('链接已复制');
  }
}

export function openNotVerifyDialog() {
  getCurrentPage().__not_verified_dialog.show();
}

export function openNotifyCounterDialog() {
  getCurrentPage().__notify_counter_dialog.show();
}

export enum DialogType {
  Unknown,
  // 分享奖励规则
  ShareRewardRule,
  // 确认使用擦亮卡
  UsePolishCard,
  AfterPublish,
  PolishCardRule,
  PublishSuccessDialog,
}

export async function openDialog<P, R>(type: DialogType, params?: P): Promise<R | undefined> {
  if (type === DialogType.Unknown) {
    throw Error('unable open unknown dialog')
  }
  const dialog = getCurrentPage()[getDialogKey(type)];
  if (!dialog) {
    throw Error(`dialog ${DialogType[type]} is not registered in current page`);
  }
  return new Promise(res => {
    DialogHelper.setParams(type, params);
    dialog.show(() => {
      res(DialogHelper.getResult(type));
    });
  });
}

export const DialogHelper = {
  initDialog(comp) {
    getCurrentPage()[getDialogKey(comp.properties.type)] = comp;
  },
  clearDialog(comp) {
    delete getCurrentPage()[getDialogKey(comp.properties.type) + '_params'];
    delete getCurrentPage()[getDialogKey(comp.properties.type) + '_result'];
  },
  getParams<T>(dialog: DialogType): T | undefined {
    const page = getCurrentPage();
    const key = getDialogKey(dialog) + '_params';
    const d = page[key];
    delete page[key];
    return d;
  },
  setParams<T>(dialog: DialogType, p: T) {
    const page = getCurrentPage();
    const key = getDialogKey(dialog) + '_params';
    // if (page[key]) {
    //   throw Error('last params is not consumed');
    // }
    page[key] = p;
  },
  getResult<T>(dialog: DialogType): T | undefined {
    const page = getCurrentPage();
    const key = getDialogKey(dialog) + '_result';
    const d = page[key];
    delete page[key];
    return d;
  },
  setResult<T>(dialog: DialogType, r: T) {
    const page = getCurrentPage();
    const key = getDialogKey(dialog) + '_result';
    // if (page[key]) {
    //   throw Error('last result is not consumed');
    // }
    page[key] = r;
  },
  closeSelf(comp: any) {
    comp.__dialog.hide();
  }
}

function getDialogKey(type: DialogType) {
  return `__dialog_${type}`;
}

export function openMyPolishCard() {
  wx.navigateTo({ url: '/pages/my_polish_card/index' }).then();
}