import { Conversation, Group, Message } from '@tencentcloud/chat';
import { debounce, generateUUID, sleep, tryJsonParse } from './other';
import { Observable, Subject } from 'rxjs';
import { User } from '../types';

/**
 * 通过交易创建出来群组的属性列表
 *
 * See also {@link getCommodityGroupAttributes} {@link setCommodityGroupAttributes}
 */
export interface CommodityGroupAttributes {
  sellerId: string;
  buyerId: string;
  commodityId: string;
  transactionId: number;
}

interface CustomMessagePayload {
}

const conversationsUpdateSubject = new Subject<Conversation[]>();
const conversationSubjects = new Map<string, Subject<Conversation>>();
const conversationByGroupSubjects = new Map<string, Subject<Conversation>>();
const messageSubjects = new Map<string, Subject<Message>>();

const idToConversation = new Map<string, Conversation>();
const groupIdToConversation = new Map<string, Conversation>();

const groupAttrsCache = new Map<string, CommodityGroupAttributes>;

export function initTim(self: User) {
  const updateConversations = debounce((list: Conversation[]) => {
    idToConversation.clear();
    for (const conv of list) {
      idToConversation.set(conv.conversationID, conv);
      conversationSubjects.get(conv.conversationID)?.next(conv);
      if (conv.groupProfile) {
        groupIdToConversation.set(conv.groupProfile.groupID, conv);
        conversationByGroupSubjects.get(conv.groupProfile.groupID)?.next(conv);
      }
    }
    conversationsUpdateSubject.next(list)
  }, 200);

  loadCache().then();
  getConversations().then((result: any) => {
    updateConversations(result.data.conversationList);
  });
  tim.on(tim.EVENT.CONVERSATION_LIST_UPDATED, (event: any) => {
    updateConversations(event.data as Conversation[]);
  })
  tim.on(tim.EVENT.MESSAGE_RECEIVED, (event: any) => {
    const messages = event.data as Message[];
    for (const msg of messages) {
      messageSubjects.get(msg.conversationID)?.next(msg);
    }
  });
}

export async function getConversations(): Promise<Conversation[]> {
  return (await tim.getConversationList()).data.conversationList ?? [];
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
 * 创建用于交易的群组ID
 *
 * TODO 这个ID不可靠，改为在服务端维护ID，或者在服务端建群
 */
export function getGroupIdForTransaction(): string {
  return 'CO_' + generateUUID();
}

/**
 * 是否是用于交易的群组ID
 */
export function isTransactionGroup(groupId: string): boolean {
  return groupId.startsWith('CO_');
}

/**
 * 是否是新发起群聊时发送的消息
 */
export function isCreateGroupMsg(msg: Message): boolean {
  return msg.type === tim.TYPES.MSG_CUSTOM && tryJsonParse(msg?.payload?.data as string)?.businessID === 'group_create'
    // @ts-ignore
    || msg.messageForShow === '[群提示消息]';
}

export async function getConversationByGroup(groupId: string, reties: number = 8): Promise<Conversation | undefined> {
  let res = groupIdToConversation.get(groupId);
  if (res) {
    return res;
  }
  for (let i = reties; i--; i > 0) {
    res = groupIdToConversation.get(groupId);
    if (res) {
      return res;
    }
    await sleep(200);
  }
  // TODO 尝试给群组里面发一条激活消息
  return undefined;
}

export async function getConversationById(convId: string, reties: number = 8): Promise<Conversation | undefined> {
  let res = idToConversation.get(convId);
  if (res) {
    return res;
  }
  for (let i = reties; i--; i > 0) {
    res = idToConversation.get(convId);
    if (res) {
      return res;
    }
    await sleep(200);
  }
  return undefined;
}

export async function tryDeleteConversationAndGroup(conv: Conversation) {
  try {
    await tim.dismissGroup(conv.groupProfile.groupID);
  } catch (e) {
    console.log(e);
  }
  try {
    await tim.quitGroup(conv.groupProfile.groupID);
  } catch (e) {
    console.log(e);
  }
  try {
    await tim.deleteConversation({
      conversationIDList: [conv.conversationID]
    });
  } catch (e) {
    console.log(e);
  }
}

export async function deleteAllGroup() {
  const list = (await tim.getGroupList()).data.groupList as Group[];
  for (const g of list) {
    await tim.dismissGroup(g.groupID);
  }
  return list.length;
}

async function saveCache() {
  await wx.setStorage({
    key: 'groupAttrsCache', data: JSON.stringify([...groupAttrsCache.entries()])
  });
}

async function loadCache() {
  const groupAttrsCacheEntries: [string, CommodityGroupAttributes][] =
    tryJsonParse((await wx.getStorage({ key: 'groupAttrsCache' })).data ?? '[]') ?? [];
  for (const entries of groupAttrsCacheEntries) {
    groupAttrsCache.set(entries[0], entries[1]);
  }
}

export async function setCommodityGroupAttributes(groupID: string, attrs: CommodityGroupAttributes) {
  await tim.updateGroupProfile({
    groupID,
    introduction: JSON.stringify(attrs),
  })
  groupAttrsCache.set(groupID, attrs);
  saveCache().then();
}

export async function getCommodityGroupAttributes(group: string | Group, cache = true): Promise<CommodityGroupAttributes | undefined> {
  const groupID = typeof group === 'string' ? group : group.groupID;
  if (cache) {
    const res = groupAttrsCache.get(groupID);
    if (res) {
      return res;
    }
  }
  if (typeof group === 'string' || !group.introduction) {
    group = (await tim.getGroupProfile({ groupID }))?.data?.group as Group;
    if (!group) {
      throw Error(`invalid groupId ${groupID}`);
    }
  }
  const res = tryJsonParse(group.introduction);
  groupAttrsCache.set(groupID, res);
  saveCache().then();
  return res;
}

export function listenConversationListUpdate(): Observable<Conversation[]> {
  return conversationsUpdateSubject;
}

/**
 * 监听会话消息，也包括自己发送的消息
 */
export function listenMessage(conversationId: string): Observable<Message> {
  let subject = messageSubjects.get(conversationId);
  if (!subject) {
    subject = new Subject<Message>();
    messageSubjects.set(conversationId, subject);
  }
  return subject;
}

export function listenConversationByGroup(groupId: string): Observable<Conversation> {
  let subject = conversationByGroupSubjects.get(groupId);
  if (!subject) {
    subject = new Subject<Conversation>();
    conversationByGroupSubjects.set(groupId, subject);
  }
  return subject;
}

export function listenConversation(conversationId: string): Observable<Conversation> {
  let subject = conversationSubjects.get(conversationId);
  if (!subject) {
    subject = new Subject<Conversation>();
    conversationSubjects.set(conversationId, subject);
  }
  return subject;
}

export async function sendMessage(msg: Message) {
  msg = (await tim.sendMessage(msg)).data.message;
  if (msg && msg.conversationType === tim.TYPES.CONV_GROUP) {
    const conv = await getConversationByGroup(msg.to, 0);
    if (conv) {
      messageSubjects.get(conv.conversationID)?.next(msg);
    }
  }
}
