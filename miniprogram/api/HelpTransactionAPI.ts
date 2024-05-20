import { Resp } from './resp';
import { request, wrapResp } from './api';

export interface HelpTransaction {
  id: number;
  seller: string;
  buyer: string;
  help_id: string;
  conversation_id: string;
  status: number;
  create_time: number;
  book_time?: number;
  finish_time?: number;
  finish_reason?: number;
  terminate_reason?: string;
}

export enum HelpTransactionStatus {
  /** 空闲中（刚创建，正在聊天） */
  Idle = 0,
  /** 请求预定 */
  RequestingBooking = 1,
  /** 已同意预定 */
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

export enum HelpTransactionFinishReason {
  Seller = 0,
  Timer = 1,
}

export interface ListHelpTransactionFilter {
  status?: HelpTransactionStatus
}

export const HelpTransactionAPI = {
  async listBuying(filter?: ListHelpTransactionFilter): Promise<Resp<HelpTransaction[]>> {
    return wrapResp(await request({
      path: `/helpTransaction/list/buying`,
      data: { ...filter },
    }))
  },
  async listSelling(filter?: ListHelpTransactionFilter): Promise<Resp<HelpTransaction[]>> {
    return wrapResp(await request({
      path: `/helpTransaction/list/selling`,
      data: { ...filter },
    }))
  },
  async listByHelp(coid: string, filter?: ListHelpTransactionFilter): Promise<Resp<HelpTransaction[]>> {
    return wrapResp(await request({
      path: `/helpTransaction/list/by_help/${coid}`,
      data: { ...filter },
    }))
  },
  async getById(id: number): Promise<Resp<HelpTransaction>> {
    return wrapResp(await request({
      path: `/helpTransaction/get/${id}`,
    }))
  },
  async start(helpId: string, conversationId: string): Promise<Resp<HelpTransaction>> {
    return wrapResp(await request({
      path: '/helpTransaction/start',
      data: {
        help_id: helpId,
        conversation_id: conversationId
      },
    }))
  },
  async requestBooking(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/helpTransaction/requestBooking/${id}`,
    }))
  },
  async agreeBooking(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/helpTransaction/agreeBooking/${id}`,
    }))
  },
  async denyBooking(id: number, reason: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/helpTransaction/denyBooking/${id}`,
      data: { reason }
    }))
  },
  async cancelBooking(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/helpTransaction/cancelBooking/${id}`,
    }))
  },
  async confirmTerminated(id: number, reason: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/helpTransaction/confirmTerminated/${id}`,
      data: { reason }
    }))
  },
  async confirmSold(id: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: `/helpTransaction/confirmSold/${id}`,
    }))
  },
}
