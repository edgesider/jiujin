import { request, wrapResp } from './api';
import { PolishCardDetail, ResponsePage, User } from '../types';
import { getNotifyStates, NotifyType } from '../utils/notify';
import { getEnvVersion } from '../utils/env';
import { Resp } from './resp';

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
    return wrapResp(await request({
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
  async getPolishCardDetails(page: number, pageSize: number): Promise<Resp<ResponsePage<PolishCardDetail>>> {
    return wrapResp(await request({
      path: '/user/polishCardInfo',
      method: 'GET',
      params: {
        page: page,
        size: pageSize
      }
    }));
  },
  async addedToMyProgram() {
    return wrapResp(await request({
      path: '/user/addToMyPro',
      method: 'GET',
    }))
  }
}