import { MetricAPI } from '../api/MetricAPI';
import { getGlobals } from './globals';
import { getEnvVersion, getVersionInfo } from './env';

class Metric {
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