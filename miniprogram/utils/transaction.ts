import { TransactionAPI, TransactionStatus } from '../api/TransactionAPI';
import { HelpTransactionAPI, HelpTransactionStatus } from '../api/HelpTransactionAPI';
import { getOpenId } from '../api/api';
import { Commodity, Help, User } from '../types';
import {
  getConversationByGroup,
  getGroupIdForHelpTransaction,
  getGroupIdForTransaction,
  getImUidFromUid,
  getOrCreateGroup,
  setCommodityGroupAttributes,
  setHelpGroupAttributes,
  tryDeleteConversationAndGroup
} from './oim';

const DESC_LENGTH = 50;

function getDesc(obj: Commodity | Help): string {
  return obj.content.substring(0, DESC_LENGTH).replace('\n', ' ');
}

/**
 * 根据商品和卖家创建群聊
 */
export async function startTransaction(commodity: Commodity, seller: User) {
  const transactions = await TransactionAPI.listByCommodity(
    commodity._id,
    { status: TransactionStatus.Booked }
  );
  if (transactions.isError) {
    console.error('failed to query existed transactions');
    return;
  }
  const transaction = transactions.data?.[0];
  if (transaction) {
    transaction.buyer
    return transaction;
  }
  const [group, newCreate] = await getOrCreateGroup(
    getGroupIdForTransaction(),
    {
      name: seller.name,
      avatar: commodity.img_urls[0],
      members: [getImUidFromUid(seller._id)],
      adminMembers: [],
    }
  );
  console.log(`created group ${group.groupID} for commodity ${commodity._id}`);
  const conv = await getConversationByGroup(group.groupID);
  if (!conv) {
    console.error('failed to get conversation');
    return;
  }
  console.log(`starting transaction: commodity=${commodity._id} conversation=${conv.conversationID}`)
  const resp = await TransactionAPI.start(commodity._id, conv.conversationID);
  if (resp.isError) {
    console.error('failed to start a new transaction');
    await tryDeleteConversationAndGroup(conv);
    return;
  }
  const tact = resp.data!!;
  await setCommodityGroupAttributes(group.groupID, {
    commodityId: commodity._id,
    sellerId: seller._id,
    transactionId: tact.id,
    buyerId: getOpenId(),
    desc: getDesc(commodity),
  });
  return tact;
}

export async function startHelpTransaction(help: Help, seller: User) {
  const transactions = await HelpTransactionAPI.listByHelp(
    help._id,
    { status: HelpTransactionStatus.Booked }
  );
  if (transactions.isError) {
    console.error('failed to query existed transactions');
    return;
  }
  const transaction = transactions.data?.[0];
  if (transaction) {
    return transaction;
  }
  const [group, newCreate] = await getOrCreateGroup(
    getGroupIdForHelpTransaction(),
    {
      name: seller.name,
      avatar: help.img_urls[0],
      members: [getImUidFromUid(seller._id)],
      adminMembers: [],
    }
  );
  console.log(`created group ${group.groupID} for help ${help._id}`);
  const conv = await getConversationByGroup(group.groupID);
  if (!conv) {
    console.error('failed to get conversation');
    return;
  }
  console.log(`starting transaction: help=${help._id} conversation=${conv.conversationID}`)
  const resp = await HelpTransactionAPI.start(help._id, conv.conversationID);
  if (resp.isError) {
    console.error('failed to start a new transaction');
    await tryDeleteConversationAndGroup(conv);
    return;
  }
  const tact = resp.data!!;
  await setHelpGroupAttributes(group.groupID, {
    helpId: help._id,
    sellerId: seller._id,
    transactionId: tact.id,
    buyerId: getOpenId(),
    desc: getDesc(help),
  });
  return tact;
}
