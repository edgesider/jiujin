import { Resp } from './resp';
import { convertHelp, Help, ViewsInfo } from '../types';
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
      path: `/help/detail/${id}`,
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
    status: number | number[], role: 'buyer' | 'seller',
    start: number, count: number, onlyBounty?: boolean,
  }) {
    return convertListResp(wrapResp(await request({
      path: '/help/getMyHelps',
      data: {
        start: params.start, count: params.count,
        role: params.role, only_bounty: Boolean(params.onlyBounty),
        status_list: Array.isArray(params.status) ? params.status : [params.status]
      },
    })));
  },
  async listLiked(params: { start: number, count: number }) {
    return convertListResp(wrapResp(await request({
      path: '/help/getMyLikes',
      data: { start: params.start, count: params.count }
    })));
  },
  async like(id: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/help/like',
      data: { hid: id }
    }));
  },
  async unlike(id: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/help/cancelLike',
      data: { hid: id }
    }));
  },
  async listCollected(params: { start: number, count: number }) {
    return convertListResp(wrapResp(await request({
      path: '/help/getMyCollects',
      data: { start: params.start, count: params.count }
    })));
  },
  async collect(id: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/help/collect',
      data: { hid: id }
    }));
  },
  async uncollect(id: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/help/cancelCollect',
      data: { hid: id }
    }));
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
  async addViewCount(id: string) {
    return wrapResp(await request({
      path: '/help/add_view',
      data: { _id: id }
    }));
  },
  /**
   * 获取浏览量相关数据
   */
  async getViewsInfo(id: string): Promise<Resp<ViewsInfo>> {
    return wrapResp(await request({
      path: `/page_view/${id}`,
      method: 'GET',
      data: {}
    }))
  },
}