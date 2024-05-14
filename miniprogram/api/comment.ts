import { Comment, CommentEntityType, convertComment } from '../types';
import { request, wrapResp } from './api';
import { Resp } from './resp';


export const CommentAPIv2 = {
  async get(entityId: string): Promise<Resp<Comment[]>> {
    const resp = wrapResp(await request({
      path: '/comment/get',
      data: { entity_id: entityId, }
    }));
    if (!resp.isError) {
      resp.data = resp.data.map(convertComment);
    }
    return resp;
  },
  async add(entityId: string, entityType: CommentEntityType, content: string, replyTo: number) {
    return wrapResp(await request({
      path: '/comment/add',
      data: {
        content,
        entity_id: entityId,
        entity_type: entityType,
        reply_to: replyTo
      }
    }));
  },
  async del(id: number) {
    return wrapResp(await request({
      path: '/comment/delete',
      data: { id }
    }))
  },
}