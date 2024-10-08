import { User } from '../types';
import {
  CbEvents,
  ConversationItem,
  GroupItem,
  GroupMemberFilter,
  GroupType,
  MessageItem,
  MessageType,
  OpenIMSDK,
  Platform,
  SessionType,
  WsResponse
} from '../lib/openim/index';
import { generateUUID, tryJsonParse } from './other';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import api, { getOpenId } from '../api/api';
import getConstants from '../constants';
import { getGlobals } from './globals';

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
  desc: string;
}

export interface HelpGroupAttributes {
  sellerId: string;
  buyerId: string;
  helpId: string;
  transactionId: number;
  desc: string;
}

export function checkOimResult<T>(res: WsResponse<T>, raise: false): T | undefined
export function checkOimResult<T>(res: WsResponse<T>, raise: true): T
export function checkOimResult<T>(res: WsResponse<T>): T
export function checkOimResult<T>(res: WsResponse<T>, raise: boolean = true): T | undefined {
  if (res.errCode !== 0) {
    const msg = `oim operation failed: ${res.event}[code=${res.errCode}] ${res.errMsg}`;
    if (raise) {
      throw Error(msg);
    } else {
      console.warn(msg)
      return undefined;
    }
  }
  return res.data;
}

let oim: OpenIMSDK;
let loginWaiters: [(() => void), ((err: any) => void)][] = [];

export async function initOpenIM(self: User, forceUpdateToken = false) {
  oim?.release();
  oim = new OpenIMSDK();
  // @ts-ignore
  globalThis.oim = oim;

  oim.addOnLoginStateChangeListener(onLoginStateChanged);

  try {
    // const platformID =
    //   getConstants().Platform === 'devtools' ? Platform.MacOSX : Platform.Web;
    const platformID = Platform.Web;
    const token = (await api.getOimToken(platformID, forceUpdateToken)).data;
    const res = await oim.login({
      userID: self._id,
      token,
      wsAddr: 'wss://im.lllw.cc/ws/',
      apiAddr: 'https://im.lllw.cc/api/',
      platformID,
    });
    checkOimResult(res, true);
  } catch (e) {
    loginWaiters.forEach(([_, rej]) => rej(e));
    loginWaiters.length = 0;
    console.error('init openim failed', e);
    throw e;
  }
  loginWaiters.forEach(([res, _]) => res());
  loginWaiters.length = 0;
  listenEvents();
}

async function onLoginStateChanged(loggedIn: boolean) {
  if (loggedIn) {
    loginWaiters.forEach(w => w[0]());
  }
}

export function isOimLogged() {
  return Boolean(oim?.isLoggedIn());
}

export async function waitForOimLogged() {
  if (isOimLogged()) {
    return;
  }
  return new Promise<void>((res, rej) => {
    loginWaiters.push([res, rej]);
  })
}

export async function getAllConversationList(): Promise<ConversationItem[]> {
  return allConvListSubject.value;
}

export async function getConversationList(offset: number, count: number): Promise<ConversationItem[]> {
  const res = await oim.getConversationListSplit({ offset, count });
  return checkOimResult(res);
}

export async function getGroup(id: string): Promise<GroupItem | undefined> {
  return checkOimResult(await oim.getSpecifiedGroupsInfo([id]))[0];
}

export async function getOrCreateGroup(
  id: string,
  createOptions: {
    name: string,
    avatar: string,
    members: string[],
    adminMembers: string[],
  }
): Promise<[GroupItem, boolean]> {
  let group = await getGroup(id);
  if (group) {
    return [group, false];
  }
  const resp = await oim.createGroup({
    groupInfo: {
      groupID: id,
      groupType: GroupType.Group,
      groupName: createOptions.name,
      faceURL: createOptions.avatar,
    },
    memberUserIDs: createOptions.members,
    adminUserIDs: createOptions.adminMembers,
  });
  return [checkOimResult(resp), true];
}

export function getImUidFromUid(uid: string) {
  return uid;
}

export function getGroupIdForTransaction(): string {
  return 'CO_' + generateUUID();
}

export function getGroupIdForHelpTransaction(): string {
  return 'HELP_' + generateUUID();
}

export function isCommodityTransactionGroup(groupId: string): boolean {
  return groupId.startsWith('CO_');
}

export function isHelpTransactionGroup(groupId: string): boolean {
  return groupId.startsWith('HELP_');
}


/**
 * 是否是用于交易的群组ID
 */
export function isTransactionGroup(groupId: string): boolean {
  return isCommodityTransactionGroup(groupId) || isHelpTransactionGroup(groupId);
}

export function isTransactionConv(convId: string) {
  return isTransactionGroup(getGroupIdFromConv(convId));
}

export function isSystemGroup(groupId: string): boolean {
  const openId = getOpenId();
  if (!openId) {
    throw Error('not login');
  }
  return groupId.startsWith(getOpenId());
}

export function isSystemConv(convId: string) {
  return isSystemGroup(getGroupIdFromConv(convId));
}

export function isOthersNewCreateConversation(conv: ConversationItem) {
  const lastMsg = tryJsonParse<MessageItem>(conv.latestMsg);
  // noinspection RedundantIfStatementJS
  if (!lastMsg || lastMsg.contentType !== MessageType.GroupCreated || lastMsg.sendID === getOpenId()) {
    return false;
  }
  return true;
}

export async function getConversationByGroup(group: string | GroupItem): Promise<ConversationItem | undefined> {
  if (typeof group === 'object') {
    group = group.groupID;
  }
  return checkOimResult(await oim.getOneConversation({
    sourceID: group,
    sessionType: SessionType.Group
  }));
}

export async function getConversationById(conv: string | ConversationItem): Promise<ConversationItem | undefined> {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  // @ts-ignore
  return checkOimResult(await oim.getMultipleConversation([conv]))[0];
}

export async function tryDeleteConversationAndGroup(conv: ConversationItem) {
  try {
    checkOimResult(await oim.deleteConversationAndDeleteAllMsg(conv.conversationID), false);
    checkOimResult(await oim.dismissGroup(conv.groupID), false);
  } catch (e) {
    console.warn(e);
  }
}

export async function deleteConversation(conv: ConversationItem | string) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  checkOimResult(await oim.deleteConversationAndDeleteAllMsg(conv), false);
}

export async function setCommodityGroupAttributes(groupID: string, attrs: CommodityGroupAttributes) {
  if (!isCommodityTransactionGroup(groupID)) {
    throw Error(`not transaction group: ${groupID}`);
  }
  checkOimResult(await oim.setGroupInfo({
    groupID,
    ex: JSON.stringify(attrs)
  }));
}

export async function getCommodityGroupAttributes(group: string | GroupItem): Promise<CommodityGroupAttributes | undefined> {
  if (typeof group === 'string') {
    const g = await getGroup(group);
    if (!g) {
      return undefined;
    }
    group = g;
  }
  if (!isCommodityTransactionGroup(group.groupID)) {
    return undefined;
  }
  return tryJsonParse<CommodityGroupAttributes>(group?.ex) ?? undefined;
}

export async function setHelpGroupAttributes(groupID: string, attrs: HelpGroupAttributes) {
  if (!isHelpTransactionGroup(groupID)) {
    throw Error(`not transaction group: ${groupID}`);
  }
  checkOimResult(await oim.setGroupInfo({
    groupID,
    ex: JSON.stringify(attrs)
  }));
}

export async function getHelpGroupAttributes(group: string | GroupItem): Promise<HelpGroupAttributes | undefined> {
  if (typeof group === 'string') {
    const g = await getGroup(group);
    if (!g) {
      return undefined;
    }
    group = g;
  }
  if (!isHelpTransactionGroup(group.groupID)) {
    return undefined;
  }
  return tryJsonParse<HelpGroupAttributes>(group?.ex) ?? undefined;
}

export function getConvIdFromGroup(group: GroupItem | string) {
  if (typeof group === 'object') {
    group = group.groupID;
  }
  return 'sg_' + group;
}

export function getGroupIdFromConv(conv: ConversationItem | string) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  if (conv.startsWith('sg_')) {
    return conv.substring('sg_'.length);
  }
  throw Error(`invalid conversation id: ${conv}`);
}

const newConvListSubject = new Subject<ConversationItem[]>();
const convSubjects = new Map<string, Subject<ConversationItem>>();
const convChangeSubjects = new Subject<ConversationItem[]>();
const convByGroupIdSubjects = new Map<string, Subject<ConversationItem>>();
const allMsgSubject = new Subject<MessageItem>();
const convMsgSubjects = new Map<string, Subject<MessageItem>>();
const totalUnreadCountSubject = new BehaviorSubject(0);
const allConvListSubject = new BehaviorSubject<ConversationItem[]>([]);
let tokenRefreshCounter = 0;

function listenEvents() {
  oim.getAllConversationList().then(res => {
    const convList = checkOimResult(res);
    allConvListSubject.next(convList)
  });
  oim.on(CbEvents.OnRecvNewMessages, event => {
    const msgList = event.data as MessageItem[];
    msgList.forEach(msg => {
      allMsgSubject.next(msg);
      if (msg.groupID) {
        convMsgSubjects.get(getConvIdFromGroup(msg.groupID))?.next(msg);
      }
    });
  });
  oim.on(CbEvents.OnNewConversation, event => {
    const convList = event.data as ConversationItem[];
    console.log('new conversation', convList);
    newConvListSubject.next(convList);
    allConvListSubject.next([...convList, ...allConvListSubject.value]);
  })
  // 会话更新
  oim.on(CbEvents.OnConversationChanged, async (event) => {
    console.log('onConversationChanged', event);
    const updated = event.data as ConversationItem[];
    convChangeSubjects.next(updated);
    updated.forEach(conv => {
      convSubjects.get(conv.conversationID)?.next(conv);
      if (conv.groupID) {
        convByGroupIdSubjects.get(conv.groupID)?.next(conv);
      }
    })

    for (const updatedConv of updated) {
      const allConvList = allConvListSubject.value;
      const idx = allConvList.findIndex(c => c.conversationID === updatedConv.conversationID);
      if (idx >= 0) {
        allConvList[idx] = updatedConv;
      }
      allConvListSubject.next(allConvList);
    }
  });
  oim.on(CbEvents.OnTotalUnreadMessageCountChanged, event => {
    console.log('unread changed', event);
    const count = event.data as number;
    if (count !== totalUnreadCountSubject.value) {
      totalUnreadCountSubject.next(event.data as number);
    }
  });
  oim.on(CbEvents.OnUserStatusChanged, event => {
    console.log('user status changed', event);
  });

  const reLogin = () => {
    const self = getGlobals().self;
    if (!self) {
      return;
    }
    if (tokenRefreshCounter > 5) {
      tokenRefreshCounter = 0;
      console.log('token invalid too many times, refreshing');
      initOpenIM(self, true);
    } else {
      initOpenIM(self);
    }
  }
  oim.on(CbEvents.OnUserTokenExpired, async (event) => {
    tokenRefreshCounter++;
    console.log('user token expired');
    setTimeout(() => {
      reLogin();
    }, 2000)
  });
  oim.on(CbEvents.OnKickedOffline, event => {
    tokenRefreshCounter++;
    console.log('kicked offline', event);
    setTimeout(() => {
      reLogin();
    }, 2000)
  })
}

export function listenNewConvList(): Observable<ConversationItem[]> {
  return newConvListSubject;
}

export function listenConversations(): Observable<ConversationItem[]> {
  return convChangeSubjects;
}

export function listenAllConversationsList(): Observable<ConversationItem[]> {
  return allConvListSubject;
}

export function listenConversation(conv: string | ConversationItem): Observable<ConversationItem> {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  let convSubj = convSubjects.get(conv);
  if (!convSubj) {
    convSubj = new Subject<ConversationItem>();
    convSubjects.set(conv, convSubj);
  }
  return convSubj;
}

export function listenConversationByGroup(group: string | GroupItem): Observable<ConversationItem> {
  if (typeof group === 'object') {
    group = group.groupID;
  }
  let subj = convByGroupIdSubjects.get(group);
  if (!subj) {
    subj = new Subject<ConversationItem>();
    convByGroupIdSubjects.set(group, subj);
  }
  return subj;
}

export function listenAllMessage(): Observable<MessageItem> {
  return allMsgSubject;
}

export function listenMessage(conv: string | ConversationItem): Observable<MessageItem> {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  let subj = convMsgSubjects.get(conv);
  if (!subj) {
    subj = new Subject();
    convMsgSubjects.set(conv, subj);
  }
  return subj;
}

/**
 * 监听会话消息，也包括自己发送的消息
 */
export async function sendMessage(msg: MessageItem, receiver: string, receiverType: 'group' | 'user') {
  checkOimResult(await oim.sendMessage({
    groupID: receiverType === 'group' ? receiver : '',
    recvID: receiverType === 'user' ? receiver : '',
    message: msg,
  }));
  if (msg.groupID) {
    const conv = await getConversationByGroup(msg.groupID);
    if (conv) {
      convMsgSubjects.get(conv.conversationID)?.next(msg);
    }
  }
}

export async function getMessageList(conv: string | ConversationItem) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  return checkOimResult(await oim.getAdvancedHistoryMessageList({
    conversationID: conv,
    count: 12,
    startClientMsgID: '',
    lastMinSeq: 0,
  }));
}

export async function markConvMessageAsRead(conv: string | ConversationItem) {
  if (typeof conv === 'object') {
    conv = conv.conversationID;
  }
  try {
    checkOimResult(await oim.markConversationMessageAsRead(conv), false);
  } catch (e) {
  }
}

export function listenUnreadCount(): Subject<number> {
  return totalUnreadCountSubject;
}

export async function getMemberList(group: string | GroupItem) {
  if (typeof group === 'object') {
    group = group.groupID;
  }
  return checkOimResult(await oim.getGroupMemberList({
    groupID: group,
    filter: GroupMemberFilter.All,
    count: 20,
    offset: 0
  }));
}