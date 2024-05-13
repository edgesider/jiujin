import { User } from '../types';
import {
  CbEvents,
  ConversationItem,
  GroupItem,
  GroupType, LoginStatus,
  MessageItem,
  MessageType,
  OpenIMSDK,
  Platform,
  SessionType,
  WsResponse
} from 'open-im-sdk';
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
}

export interface HelpGroupAttributes {
  sellerId: string;
  buyerId: string;
  helpId: string;
  transactionId: number;
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
let hasLogin = false;
let loginWaiters: [(() => void), ((err: any) => void)][] = [];

export async function initOpenIM(self: User, forceUpdateToken = false) {
  if (hasLogin) {
    return;
  }
  oim = new OpenIMSDK();
  // @ts-ignore
  globalThis.oim = oim;

  try {
    const platform = getConstants().Platform === 'devtools' ? Platform.MacOSX : Platform.Web;
    const token = (await api.getOimToken(platform, forceUpdateToken)).data;
    const res = await oim.login({
      userID: self._id,
      token,
      wsAddr: 'wss://im.lllw.cc/ws/',
      apiAddr: 'https://im.lllw.cc/api/',
      platformID: platform,
    });
    checkOimResult(res, true);
  } catch (e) {
    loginWaiters.forEach(([_, rej]) => rej(e));
    loginWaiters.length = 0;
    return;
  }
  hasLogin = true;
  loginWaiters.forEach(([res, _]) => res());
  listenEvents();
}

export async function waitForOimReady() {
  if (hasLogin) {
    return;
  }
  return new Promise<void>((res, rej) => {
    loginWaiters.push([res, rej]);
  })
}

export async function getConversationList(): Promise<ConversationItem[]> {
  // TODO 支持分页
  return checkOimResult(await oim.getAllConversationList());
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

export function isOthersNewCreateConversation(conv: ConversationItem) {
  const lastMsg = tryJsonParse<MessageItem>(conv.latestMsg);
  if (!lastMsg || lastMsg.contentType !== MessageType.GroupCreated) {
    return false;
  }
  return lastMsg.sendID !== getOpenId();
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
  checkOimResult(await oim.deleteConversationAndDeleteAllMsg(conv.conversationID), false);
  checkOimResult(await oim.dismissGroup(conv.groupID), false);
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
  if (typeof group === 'object') {
    group = group.groupID;
  }
  if (!isCommodityTransactionGroup(group)) {
    return undefined;
  }
  const grp = await getGroup(group);
  return tryJsonParse<CommodityGroupAttributes>(grp?.ex) ?? undefined;
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
  if (typeof group === 'object') {
    group = group.groupID;
  }
  if (!isHelpTransactionGroup(group)) {
    return undefined;
  }
  const grp = await getGroup(group);
  return tryJsonParse<HelpGroupAttributes>(grp?.ex) ?? undefined;
}

export function getConvIdFromGroup(group: GroupItem | string) {
  if (typeof group === 'object') {
    group = group.groupID;
  }
  return 'sg_' + group;
}

const newConvListSubject = new Subject<ConversationItem[]>();
const convSubjects = new Map<string, Subject<ConversationItem>>();
const convChangeSubjects = new Subject<ConversationItem[]>();
const convByGroupIdSubjects = new Map<string, Subject<ConversationItem>>();
const convMsgSubjects = new Map<string, Subject<MessageItem>>();
const totalUnreadCountSubject = new BehaviorSubject(0);

function listenEvents() {
  oim.on(CbEvents.OnRecvNewMessages, event => {
    const msgList = event.data as MessageItem[];
    msgList.forEach(msg => {
      if (msg.groupID) {
        convMsgSubjects.get(getConvIdFromGroup(msg.groupID))?.next(msg);
      }
    })
    console.log('OnRecvNewMessages', msgList);
  });
  oim.on(CbEvents.OnNewConversation, event => {
    const convList = event.data as ConversationItem[];
    console.log('new conversation', convList);
    newConvListSubject.next(convList);
  })
  // 会话更新
  oim.on(CbEvents.OnConversationChanged, async (event) => {
    console.log('onConversationChanged', event);
    const convList = event.data as ConversationItem[];
    convChangeSubjects.next(convList);
    convList.forEach(conv => {
      convSubjects.get(conv.conversationID)?.next(conv);
      if (conv.groupID) {
        convByGroupIdSubjects.get(conv.groupID)?.next(conv);
      }
    })
  });
  oim.on(CbEvents.OnUserTokenExpired, async (event) => {
    hasLogin = false;
    const self = getGlobals().self; // 先拉selfInfo；如果没有session_key的话，会自动调用authorize
    if (!self) {
      return;
    }
    await initOpenIM(self, true);
  });
  oim.on(CbEvents.OnTotalUnreadMessageCountChanged, event => {
    console.log('unread changed', event);
    totalUnreadCountSubject.next(event.data as number);
  });
  oim.on(CbEvents.OnUserStatusChanged, event => {
    console.log('user status changed', event);
    hasLogin = event.data === LoginStatus.Logged;
  });
  oim.on(CbEvents.OnKickedOffline, event => {
    console.log('kicked offline', event);
    hasLogin = false;
  })
}

export function listenNewConvList(): Observable<ConversationItem[]> {
  return newConvListSubject;
}

export function listenConversations(): Observable<ConversationItem[]> {
  return convChangeSubjects;
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
  oim.getTotalUnreadMsgCount().then(res => res.errCode === 0 && totalUnreadCountSubject.next(res.data));
  return totalUnreadCountSubject;
}

export interface CustomImageMsgData {
  type: 'image';
  url: string;
  width: number;
  height: number;
}

export type CustomMsgData =
  | CustomImageMsgData
// ...
  ;

export async function createCustomMsg(data: CustomImageMsgData) {
  return checkOimResult(await oim.createCustomMessage({
    data: JSON.stringify(data),
    description: data.type,
    extension: '',
  }));
}