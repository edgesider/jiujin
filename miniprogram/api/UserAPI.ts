import { request, wrapResp } from './api';
import { User } from '../types';
import { getNotifyStates, NotifyType } from '../utils/notify';
import { getEnvVersion } from '../utils/env';

export const UserAPI = {
  async getInvitedUsers(inviterId: string) {
    return wrapResp<User[]>(await request({
      path: '/user/getInviterUsers',
      data: {
        inviter_id: inviterId,
      }
    }));
  },
  async addNotifyCount(type: NotifyType) {
    return wrapResp(await request( {
      path: '/user/addNotifyCount',
      data: {
        template_id: getNotifyStates()[type].tmpId
      }
    }))
  },
  async getMyQrCode(): Promise<ArrayBuffer | undefined> {
    const resp = await request<ArrayBuffer>({
      path: '/user/getInviteQrcode',
      data: { env: getEnvVersion() },
      responseType: 'arraybuffer'
    });
    return resp.data;
  },
}