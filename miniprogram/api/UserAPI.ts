import { request, wrapResp } from './api';
import { User } from '../types';
import { NotifyType } from '../utils/notify';
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
        notify_type: type
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