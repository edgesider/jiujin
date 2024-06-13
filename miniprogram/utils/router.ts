import { Commodity, Help, User } from '../types';
import { ConversationItem } from '../lib/openim/index';
import { AboutType } from '../pages/about';

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
      url: from ? `../commodity_publish/index?commodity=${JSON.stringify(from)}` : `../commodity_publish/index`,
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
      url: `/pages/commodity_publish/index?commodity=${JSON.stringify(commodity)}&isEdit=1`,
    });
    return;
  } else {
    return new Promise<void>(res => {
      wx.navigateTo({
        url: `/pages/commodity_publish/index?commodity=${JSON.stringify(commodity)}&isEdit=1`,
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
      url: `/pages/help_publish/index?help=${JSON.stringify(help)}&isEdit=1`,
    });
    return;
  } else {
    return new Promise<void>(res => {
      wx.navigateTo({
        url: `/pages/help_publish/index?help=${JSON.stringify(help)}&isEdit=1`,
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

export function parseURL(url: string): {
  protocol: string,
  path: string,
  params: Map<string, string>
} {
  const result = /^([^:]+):\/\/([^?]*)/.exec(url);
  if (!result) {
    throw Error('invalid url');
  }
  const [prefix, protocol, path] = result;
  const params = url.substring(prefix.length + 1).split('&');
  const paramsMap = new Map<string, string>();
  for (const param of params) {
    const eqPos = param.indexOf('=');
    if (eqPos === -1) {
      paramsMap.set(decodeURIComponent(param), '');
    } else {
      paramsMap.set(
        decodeURIComponent(param.substring(0, eqPos)),
        decodeURIComponent(param.substring(eqPos + 1)),
      );
    }
  }
  return { protocol, path, params: paramsMap };
}

export async function processSchema(str: string) {
  if (str.startsWith('lllw://')) {
    const url = parseURL(str);
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
      throw Error(`unhandled schema ${url.path}`);
    }
  } else {
    await wx.navigateTo({ url: str });
  }
}