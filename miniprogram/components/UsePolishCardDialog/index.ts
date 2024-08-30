import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { DialogHelper, DialogType, openDialog } from '../../utils/router';

export interface UsePolishCardDialogParams {
}

export interface UsePolishCardDialogResult {
  ok: boolean;
}

export async function openUsePolishCardDialog(params: UsePolishCardDialogParams = {}): Promise<UsePolishCardDialogResult | undefined> {
  return openDialog(DialogType.UsePolishCard, params);
}

Component({
  properties: {},
  data: {
    ...getConstants(),
    show: false,
    content: "商品发布后每隔48小时可手动擦亮一次\n使用「擦亮卡」则不受此时间限制"
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
    onClickOk() {
      DialogHelper.setResult(DialogType.UsePolishCard, { ok: true } satisfies UsePolishCardDialogResult);
      DialogHelper.closeSelf(this);
    },
    onClickCancel() {
      DialogHelper.closeSelf(this);
    },
  }
});
