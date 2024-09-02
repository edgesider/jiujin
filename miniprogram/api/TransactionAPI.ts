import { Resp } from './resp';
import { request, wrapResp } from './api';

export interface Transaction {
  id: number;
  seller: string;
  buyer: string;
  commodity_id: string;
  conversation_id: string;
  status: number;
  create_time: number;
  book_time?: number;
  finish_time?: number;
  finish_reason?: number;
  terminate_reason?: string;
}

export enum TransactionStatus {
  /** 空闲中（刚创建，正在聊天） */
  Idle = 0,
  /** 请求预订 */
  RequestingBooking = 1,
  /** 已同意预订 */
  Booked = 2,
  /** 已拒绝 */
  Denied = 3,
  /** 已确认完成 */
  Finished = 4,
  /** 已确认终止 */
  Terminated = 5,
  /** 对应的商品已下架 */
  Closed = 6,
}

export enum TransactionFinishReason {
  Seller = 0,
  Timer = 1,
}

export interface ListTransactionFilter {
  status?: TransactionStatus
}

export const TransactionAPI = {
  async listBuying(filter?: ListTransactionFilter): Promise<Resp<Transaction[]>> {
    return wrapResp(await request({
      path: `/transaction/list/buying`,
      data: { ...filter },
    }))
  },
  async listSelling(filter?: ListTransactionFilter): Promise<Resp<Transaction[]>> {
    return wrapResp(await request({
      path: `/transaction/list/selling`,
      data: { ...filter },
    }))
  },
  async listByCommodity(coid: string, filter?: ListTransactionFilter): Promise<Resp<Transaction[]>> {
    return wrapResp(await request({
      path: `/transaction/list/by_commodity/${coid}`,
      data: { ...filter },
    }))
  },
  async getById(id: number): Promise<Resp<Transaction>> {
    return wrapResp(await request({
      path: `/transaction/get/${id}`,
    }))
  },
  async start(commodityId: string, conversationId: string): Promise<Resp<Transaction>> {
    return wrapResp(await request({
      path: '/transaction/start',
      data: {
        commodity_id: commodityId,
        conversation_id: conversationId
      },
    }))
  },
  async requestBooking(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/transaction/requestBooking/${id}`,
    }))
  },
  async agreeBooking(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/transaction/agreeBooking/${id}`,
    }))
  },
  async denyBooking(id: number, reason: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/transaction/denyBooking/${id}`,
      data: { reason }
    }))
  },
  async cancelBooking(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/transaction/cancelBooking/${id}`,
    }))
  },
  async confirmTerminated(id: number, reason: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/transaction/confirmTerminated/${id}`,
      data: { reason }
    }))
  },
  async confirmSold(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/transaction/confirmSold/${id}`,
    }))
  },
}
