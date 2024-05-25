import { Resp } from './resp';
import { request, wrapResp } from './api';

export interface InvitationRankItem {
  _id: string;
  name: string;
  avatar_url: string;
  invite_count: number;
}

export const ActivityAPI = {
  async getUserCount(): Promise<Resp<number>> {
    return wrapResp(await request({
      path: '/activity/userCount',
      method: 'GET'
    }));
  },
  async getInvitationRank(start: number, count: number): Promise<Resp<InvitationRankItem[]>> {
    return wrapResp(await request({
      path: '/activity/invitationRank',
      data: { start, count }
    }));
  }
}