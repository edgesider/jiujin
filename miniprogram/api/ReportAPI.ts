import { EntityType } from '../types';
import { request, wrapResp } from './api';

export const ReportAPI = {
  async reportEntity(entityType: EntityType, entityId: string, reason: string) {
    return wrapResp(await request({
      path: '/report/entity',
      data: {
        report_reason: reason,
        entity_id: entityId,
        entity_type: entityType,
      }
    }));
  }
}