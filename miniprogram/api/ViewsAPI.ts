import { Resp } from './resp';
import { ViewsInfo } from '../types';
import { request, wrapResp } from './api';
import { getGlobals } from '../utils/globals';

export const ViewsAPI = {
  async addView(id: string, sharer?: string) {
    const { self } = getGlobals();
    if (!self) {
      throw Error('self info is not ready');
    }
    return wrapResp(await request({
      path: `/page_view/add`,
      method: 'POST',
      data: {
        entity_id: id,
        sharer_id: sharer,
      }
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
    }));
  },
}