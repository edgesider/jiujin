import { TransactionApi } from '../api/transaction';
import {
  getConversationByGroup,
  getGroupIdForTransaction,
  getImUidFromUid,
  getOrCreateGroup, setCommodityGroupAttributes,
  tryDeleteConversationAndGroup
} from './im';
import { getOpenId } from '../api/api';
import { Help, User } from '../types';

export async function startHelpTransaction(help: Help, seller: User) {
  const transactions = await TransactionApi.listByCommodity(help._id);
  if (transactions.isError) {
    console.error('failed to query existed transactions');
    return;
  }
  const transaction = transactions.data?.[0];
  if (transaction) {
    return transaction;
  }
  const [group, newCreate] = await getOrCreateGroup(
    getGroupIdForTransaction(),
    {
      name: seller.name,
      avatar: help.img_urls[0],
      members: [
        getImUidFromUid(getOpenId()),
        getImUidFromUid(seller._id),
      ],
    }
  );
  console.log(`created group ${group.groupID} for commodity ${help._id}`);
  const conv = await getConversationByGroup(group.groupID);
  if (!conv) {
    console.error('failed to get conversation');
    return;
  }
  console.log(`starting transaction: commodity=${help._id} conversation=${conv.conversationID}`)
  const resp = await TransactionApi.start(help._id, conv.conversationID);
  if (resp.isError) {
    console.error('failed to start a new transaction');
    await tryDeleteConversationAndGroup(conv);
    return;
  }
  const tact = resp.data!!;
  await setCommodityGroupAttributes(group.groupID, {
    commodityId: help._id,
    sellerId: seller._id,
    transactionId: tact.id,
    buyerId: getOpenId(),
  });
  return tact;
}
