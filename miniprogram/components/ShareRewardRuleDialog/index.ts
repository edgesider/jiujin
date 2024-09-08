import getConstants from '../../constants';
import { Subscription } from 'rxjs';

Component({
  properties: {},
  data: {
    ...getConstants(),
    content: `1.分享同一内容每带来10人次浏览，擦亮卡+1
2.由分享带来新注册用户，擦亮卡+5
3.由分享带来新注册用户发布内容，擦亮卡+5，并计入邀请排行榜`
  },
  lifetimes: {
    attached() {
      // @ts-ignore
      this._subscription = new Subscription();
    },
    detached() {
      this.getSubscription().unsubscribe();
    }
  },
  methods: {
    getSubscription(): Subscription {
      // @ts-ignore
      return this._subscription as Subscription;
    },
  }
});
