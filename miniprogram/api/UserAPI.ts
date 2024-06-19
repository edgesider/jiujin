import { request, wrapResp } from './api';
import { User } from '../types';
import { NotifyType } from '../utils/notify';
import { encode } from 'base64-arraybuffer';

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
  async getMyQrCode() {
    const resp = await request<ArrayBuffer>({
      path: '/user/getInviteQrcode',
      responseType: 'arraybuffer'
    });
    return 'data:image/png;base64,' + encode(resp.data);
  },
}