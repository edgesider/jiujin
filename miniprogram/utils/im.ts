import { Conversation, Group, Message } from '@tencentcloud/chat';
import { getOpenId } from '../api/api';
import { TransactionApi } from '../api/transaction';
import { sleep } from './other';
import { Observable, Subject } from 'rxjs';

/**
 * 通过交易创建出来群组的属性列表
 *
 * See also {@link getCommodityGroupAttributes} {@link setCommodityGroupAttributes}
 */
export interface CommodityGroupAttributes {
  sellerId: string;
  commodityId: string;
  transactionId: number;
}

interface CustomMessagePayload {
}


const idToConversation = new Map<string, Conversation>();
const groupIdToConversation = new Map<string, Conversation>();
const conversationListeners = new Map<string, Subject<Conversation>>();
const messageListeners = new Map<string, Subject<Message>>();

type AnyFunc = (...args: any) => any;

/**
 * 节流和防抖都是用来限制在一段时间内只执行一次。
 * 不同之处在于：
 *   节流只保留第一次执行，会丢弃后续的执行；
 *   而防抖会丢弃前面的执行，只保留最后一次执行。
 * @param func
 * @param wait
 */
export function throttle<T extends AnyFunc>(func: T, wait: number): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let recentCalled = false;
  return (...args: any) => {
    if (recentCalled) {
      return undefined;
    } else {
      recentCalled = true;
      setTimeout(() => recentCalled = false, wait);
      return func(...args);
    }
  };
}

export function debounce<T extends AnyFunc>(func: T, wait: number): (...args: Parameters<T>) => void {
  let inDebounce = false;
  let lastArgs: Parameters<T> | undefined;
  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (!inDebounce) {
      inDebounce = true;
      setTimeout(() => {
        inDebounce = false;
        // 本次节流结束之后执行，传入最后一次获得的参数
        // @ts-ignore
        func(...lastArgs!);
      }, wait);
    }
  };
}


export function initTim() {
  const updateConversations = debounce((list: Conversation[]) => {
    console.log('conversation list updated');
    idToConversation.clear();
    list.forEach(conv => {
      idToConversation.set(conv.conversationID, conv);
      if (conv.groupProfile) {
        groupIdToConversation.set(conv.groupProfile.groupID, conv);
      }
      conversationListeners.get(conv.conversationID)?.next(conv);
    });
  }, 200);

  tim.getConversationList().then((result: any) => {
    updateConversations(result.data.conversationList);
  });
  tim.on(tim.EVENT.CONVERSATION_LIST_UPDATED, (event: any) => {
    updateConversations(event.data as Conversation[]);
  })
  tim.on(tim.EVENT.MESSAGE_RECEIVED, (event: any) => {
    const messages = event.data as Message[];
    for (const msg of messages) {
      messageListeners.get(msg.conversationID)?.next(msg);
    }
  });
}

export async function getGroup(id: string): Promise<Group | undefined> {
  try {
    return (await tim.getGroupProfile({ groupID: id, }))?.data?.group;
  } catch (e) {
    return;
  }
}

export async function getOrCreateGroup(
  id: string,
  createOptions: {
    name: string,
    avatar: string,
    members: string[],
  }
): Promise<[Group, boolean]> {
  let group = await getGroup(id);
  if (group) {
    return [group, false];
  }
  const { name, avatar, members } = createOptions;
  return [(await tim.createGroup({
    type: tim.TYPES.GRP_WORK,
    name: name,
    groupID: id,
    avatar,
    memberList: members.map(id => ({ userID: id })),
    joinOption: tim.TYPES.JOIN_OPTIONS_DISABLE_APPLY,
  })).data.group, true];
}

export function getImUidFromUid(uid: string) {
  return 'USER' + uid;
}

/**
 * 根据商品获取群组ID
 *
 * TODO 这个ID不可靠，改为在服务端维护ID，或者在服务端建群
 */
export function getGroupIdFromCommodity(commodity: { _id: string }): string {
  const openId = getOpenId();
  if (!openId) {
    throw Error('not login yet');
  }
  const comm_tail = commodity._id.substring(0, commodity._id.length - 16);
  return `${openId}${comm_tail}`;
}

export function getConversationByGroup(groupId: string): Conversation | undefined {
  return groupIdToConversation.get(groupId);
}

export function getConversationById(convId: string): Conversation | undefined {
  return idToConversation.get(convId);
}

export async function deleteAllGroup() {
  const list = (await tim.getGroupList()).data.groupList as Group[];
  for (const g of list) {
    await tim.dismissGroup(g.groupID);
  }
  return list.length;
}

export async function setCommodityGroupAttributes(groupID: string, attrs: CommodityGroupAttributes) {
  await tim.setGroupAttributes({
    groupID,
    groupAttributes: {
      info: JSON.stringify(attrs)
    }
  });
}

export async function getCommodityGroupAttributes(groupID: string): Promise<CommodityGroupAttributes | undefined> {
  const attrs = await tim.getGroupAttributes({
    groupID,
    keyList: ['info']
  })
  return JSON.parse(attrs.data.groupAttributes?.info ?? 'null');
}

export function listenMessageForConversation(conversationId: string): Observable<Message> {
  let subject = messageListeners.get(conversationId);
  if (!subject) {
    subject = new Subject<Message>();
    messageListeners.set(conversationId, subject);
  }
  return subject;
}

export function listenConversation(conversationId: string): Observable<Conversation> {
  let subject = conversationListeners.get(conversationId);
  if (!subject) {
    subject = new Subject<Conversation>();
    conversationListeners.set(conversationId, subject);
  }
  return subject;
}
