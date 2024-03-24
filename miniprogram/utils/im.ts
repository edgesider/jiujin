import { Conversation, Group } from '@tencentcloud/chat';
import { getOpenId } from '../api/api';
import { TransactionApi } from '../api/transaction';
import { sleep } from './other';

export function initTim() {
  // tim.on(tim.EVENT.CONVERSATION_LIST_UPDATED, ({ data }: { data: Conversation[] }) => {
  // })
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
    type: tim.TYPES.GRP_MEETING,
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

export async function getConversationByGroup(groupId: string): Promise<Conversation | undefined> {
  const list = (await tim.getConversationList()).data.conversationList as Conversation[];
  return list?.find(cv => cv.groupProfile?.groupID === groupId);
}

export async function deleteAllGroup() {
  const list = (await tim.getGroupList()).data.groupList as Group[];
  for (const g of list) {
    await tim.dismissGroup(g.groupID);
  }
  return list.length;
}
