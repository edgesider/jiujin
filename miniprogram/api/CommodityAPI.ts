import { request, wrapResp } from './api';
import { Resp } from './resp';
import { Commodity, convertCommodity, ViewsInfo } from '../types';
import { getGlobals } from '../utils/globals';

function convertListResp(resp: Resp<any>): Resp<Commodity[]> {
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
      path: getGlobals().self ? '/commodity/getCommodities' : '/tourist/getCommodities',
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
    status?: number;
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
    status?: number;
    start?: number;
    count?: number;
  }) {
    return wrapResp(await request({
      path: '/commodity/getCommoditiesCountByUser',
      data: params
    }));
  },
  async listMine(params: {
    status: number | number[], role: 'buyer' | 'seller',
    start: number, count: number,
  }) {
    return convertListResp(wrapResp(await request({
      path: '/commodity/getMyCommodities',
      data: {
        start: params.start, count: params.count,
        role: params.role,
        status_list: Array.isArray(params.status) ? params.status : [params.status]
      },
    })));
  },
  async listCollected(params: { start: number, count: number }) {
    return convertListResp(wrapResp(await request({
      path: '/commodity/getMyCollects',
      data: { start: params.start, count: params.count }
    })));
  },
  async collect(id: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/commodity/collect',
      data: { cid: id }
    }));
  },
  async uncollect(id: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/commodity/cancelCollect',
      data: { cid: id }
    }));
  },
  async getCountInRegion(rids: number[]) {
    return wrapResp<{ rid: number, count: number }[]>(await request({
      path: '/commodity/getRegionCommodityCount',
      data: { rids }
    }))
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
  async create(params: Record<string, any>): Promise<Resp<Commodity>> {
    params.img_urls = params.img_urls.join(',');
    const resp = wrapResp(await request({
      path: '/commodity/create',
      method: 'POST',
      data: {
        ...params,
      }
    }));
    if (!resp.isError && resp.data) {
      resp.data = convertCommodity(resp.data);
    }
    return resp;
  },
  async update(id: string, params: Record<string, any>): Promise<Resp<void>> {
    params._id = id;
    params.img_urls = params.img_urls.join(',');
    return wrapResp(await request({
      path: '/commodity/modify',
      method: 'POST',
      data: {
        ...params,
      }
    }));
  },
}