import { request, wrapResp } from './api';
import { Resp } from './resp';

export enum VerifyStatus {
  NotVerified = 0,
  EmailVerified = 1,
  GPSVerified = 2,
  CardVerified = 3,
}

export const VerifyAPI = {
  async verifyByGPS(lng: number, lat: number): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/verify/gps',
      data: { longitude: lng, latitude: lat }
    }));
  },
  async verifyByEmail(email: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/verify/email',
      data: { email, }
    }));
  },
  async verifyByCardImage(url: string): Promise<Resp<void>> {
    return wrapResp(await request({
      path: '/verify/card',
      data: { card_url: url }
    }));
  },
}