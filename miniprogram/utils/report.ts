import { ensureRegistered, toastError, toastSucceed } from './other';
import { ReportAPI } from '../api/ReportAPI';
import { EntityType } from '../types';
import { openQuestionDialog } from '../components/QuestionDialog/index';

const reasons = ['广告营销', '色情低俗', '侵犯个人隐私', '辱骂诽谤他人', '标价与实际不符', '其他'];

async function doReport(entityType: EntityType, entityId: string): Promise<boolean> {
  ensureRegistered();
  const res = await wx.showActionSheet({ itemList: reasons });
  let selectedReason = reasons[res.tapIndex];
  if (selectedReason === '其他') {
    const { content } = await openQuestionDialog({
      title: '请填写举报具体原因',
      placeholder: '请描述你认为闲置或互助信息接涉嫌违规的原因',
    });
    if (content === undefined) {
      return false;
    }
    if (!content.trim()) {
      toastError('无效的举报原因', false);
      return false;
    }
    selectedReason = content.trim();
  }
  const resp = await ReportAPI.reportEntity(entityType, entityId, selectedReason);
  if (resp.isError) {
    toastError('网络错误');
    return false;
  } else {
    toastSucceed('举报成功！');
    return true;
  }
}

export async function reportHelp(helpId: string): Promise<boolean> {
  return await doReport(EntityType.Help, helpId);
}

export async function reportCommodity(commodityId: string): Promise<boolean> {
  return await doReport(EntityType.Commodity, commodityId);
}