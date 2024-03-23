import { Conversation, Group } from '@tencentcloud/chat';
import { getOpenId } from '../api/api';

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
    memberList: members.map(id => ({ userID: id }))
  })).data.group, true];
}

export function getImUidFromUid(uid: string) {
  return 'USER' + uid;
}

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
