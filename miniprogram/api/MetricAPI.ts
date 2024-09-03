import { request, wrapResp } from './api';

export const MetricAPI = {
  async write(key: string, fields: Record<string, any>, tags: Record<string, string | undefined | null>) {
    console.log(`write metric ${key}`, JSON.stringify(fields), JSON.stringify(tags));
    return wrapResp(await request({
      path: '/metrics/write',
      data: { key, fields, tags }
    }));
  }
}