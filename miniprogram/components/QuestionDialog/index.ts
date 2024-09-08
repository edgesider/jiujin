import getConstants from '../../constants';
import { Subscription } from 'rxjs';
import { DialogHelper, DialogType, openDialog } from '../../utils/router';

export interface QuestionDialogParams {
  title?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export async function openQuestionDialog(params: QuestionDialogParams): Promise<{ content?: string }> {
  return await openDialog(DialogType.Question, params) ?? {};
}

Component({
  properties: {
  },
  data: {
    ...getConstants(),
    inputValue: '',
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
    onDialogShow() {
      const params = DialogHelper.getParams(DialogType.Question) as QuestionDialogParams;
      console.log('params', params);
      this.setData({
        inputValue: '',
        title: params.title ?? '请输入',
        placeholder: params.placeholder,
        confirmText: params.confirmText ?? '确认',
        cancelText: params.cancelText ?? '取消',
      });
    },
    onClickOk() {
      DialogHelper.setResult(DialogType.Question, { content: this.data.inputValue });
      DialogHelper.closeSelf(this);
    },
    onClickCancel() {
      DialogHelper.closeSelf(this);
    },
  }
});
