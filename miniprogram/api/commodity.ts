import { request, wrapResp } from './api';
import { Resp } from './resp';
import { convertCommodity } from '../types';

function convertResp(resp: Resp<any>) {
  if (!resp.isError) {
    resp.data = (resp.data as any[]).map(convertCommodity);
  }
  return resp;
}

export const CommodityAPI = {
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
    return convertResp(wrapResp(await request({
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
    return convertResp(wrapResp(await request({
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
    const { uid, start, status, count } = params;
    return convertResp(wrapResp(await request({
      path: '/commodity/getCommoditiesByUser',
      data: {
        uid, start, count, status
      }
    })))
  }
}