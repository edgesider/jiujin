import { Resp } from './resp';
import { convertHelp, Help } from '../types';
import { request, wrapResp } from './api';

function convertListResp(resp: Resp<any>): Resp<Help[]> {
  if (!resp.isError) {
    resp.data = (resp.data as any[]).map(convertHelp);
  }
  return resp;
}

export const HelpAPI = {
  async getOne(id: string): Promise<Resp<Help>> {
    const resp = wrapResp(await request({
      path: `/help/${id}`,
      method: 'GET',
    }));
    if (!resp.isError) {
      resp.data = convertHelp(resp.data);
    }
    return resp;
  },
  async getHelps(params: {
    rid: number;
    start?: number;
    count: number;
    streamTime?: number;
    onlyBounty?: boolean;
  }): Promise<Resp<Help[]>> {
    const { rid, count, streamTime, onlyBounty } = params;
    const start = streamTime ? undefined : params.start;
    return convertListResp(wrapResp(await request({
      path: '/help/getHelps',
      data: {
        rid, start, count,
        stream_time: streamTime, only_bounty: onlyBounty
      },
    })));
  },
  async listMine(params: {
    status: number, role: 'buyer' | 'seller',
    start: number, count: number
  }) {
    return convertListResp(wrapResp(await request({
      path: '/help/getMyHelps',
      data: params,
    })));
  },
  async search() {
    throw Error('not implemented');
  },
  async listByUser() {
    throw Error('not implemented');
  },
  async countByUser() {
    throw Error('not implemented');
  },
}