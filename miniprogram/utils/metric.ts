import { MetricAPI } from '../api/MetricAPI';
import { getGlobals } from './globals';
import { getEnvVersion, getVersionInfo } from './env';

class Metric {
  /**
   * @param key 事件名
   * @param fields 数值类的参数，可以用来分析计算
   * @param tags 可枚举的参数，可以用来分组计数等
   */
  write(key: string, fields?: Record<string, any>, tags?: Record<string, string>) {
    try {
      MetricAPI.write(
        key,
        Object.assign({}, this.getCommonParams(), fields ?? {}),
        tags ?? {}
      ).then(resp => {
        if (resp.isError) {
          console.error('metric write error', resp);
        }
      }).catch(e => console.error('metric write error', e));
    } catch (e) {
      console.error('metric write error', e)
    }
  }

  private getCommonParams(): Record<string, any> {
    const self = getGlobals().self;
    return {
      uid: self?._id,
      timestamp: Date.now(),
      envVersion: getEnvVersion(),
      version: getVersionInfo().version,
    };
  }
}

export const metric = new Metric();