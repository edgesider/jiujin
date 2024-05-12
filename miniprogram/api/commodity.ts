import { request, wrapResp } from './api';
import { Resp } from './resp';
import { convertCommodity } from '../types';

function convertListResp(resp: Resp<any>) {
  if (!resp.isError) {
    resp.data = (resp.data as any[]).map(convertCommodity);
  }
  return resp;
}

export const CommodityAPI = {
  async getOne(id: string) {
    const resp = wrapResp(await request({
      path: `/commodity/${id}`,
      method: 'GET',
    }));
    if (!resp.isError) {
      resp.data = convertCommodity(resp.data);
    }
    return resp;
  },
  async getCommodities(params: {
    rid: number;
    start?: number;
    count: number;
    order: 'desc' | 'asc' | string;
    orderBy: 'polish_time' | string;
    streamTime?: number;
  }) {
    const { rid, count, order, orderBy, streamTime } = params;
    const start = streamTime ? undefined : params.start;
    return convertListResp(wrapResp(await request({
      path: '/commodity/getCommodities',
      data: {
        rid, start, count, stream_time: streamTime,
        order, order_by: orderBy,
      },
    })));
  },
  async search(params: {
    rid: number;
    start?: number;
    count: number;
    keyword: string;
    order: 'desc' | 'asc';
    orderBy: 'polish_time';
  }) {
    const { rid, start, count, order, orderBy, keyword } = params;
    return convertListResp(wrapResp(await request({
      path: '/commodity/getCommodities',
      data: {
        rid, start, count, keyword,
        order, order_by: orderBy,
      },
    })));
  },
  async listByUser(params: {
    uid: string;
    status: number;
    start?: number;
    count?: number;
  }) {
    return convertListResp(wrapResp(await request({
      path: '/commodity/getCommoditiesByUser',
      data: params
    })));
  },
  async countByUser(params: {
    uid: string;
    status: number;
    start?: number;
    count?: number;
  }) {
    return wrapResp(await request({
      path: '/commodity/getCommoditiesCountByUser',
      data: params
    }));
  },
  async listMine(params: {
    status: number, role: 'buyer' | 'seller',
    start: number, count: number
  }) {
    return convertListResp(wrapResp(await request({
      path: '/commodity/getMyCommodities',
      data: params,
    })))
  },
}