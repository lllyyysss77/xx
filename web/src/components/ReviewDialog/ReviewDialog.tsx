/**
 * 标准审核批复弹窗
 * —— 统一「通过 / 驳回 + 审核意见」交互模式
 *
 * 用法:
 *   <ReviewDialog
 *     visible={visible}
 *     title="审核提案"
 *     onClose={() => setVisible(false)}
 *     onConfirm={async (decision, note) => {
 *       await reviewProposal(id, decision, note);
 *       MessagePlugin.success('操作成功');
 *       setVisible(false);
 *       refresh();
 *     }}
 *   />
 */
import React from 'react';
import { Dialog, Textarea } from 'tdesign-react';

export type ReviewDecision = 'approved' | 'rejected';

interface ReviewDialogProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (decision: ReviewDecision, note: string) => Promise<void> | void;
  /** 备注占位符 */
  notePlaceholder?: string;
  /** 备注是否必填 */
  noteRequired?: boolean;
  /** 确认按钮文案 */
  approveText?: string;
  /** 驳回按钮文案 */
  rejectText?: string;
}

export const ReviewDialog: React.FC<ReviewDialogProps> = ({
  visible,
  title,
  onClose,
  onConfirm,
  notePlaceholder = '请输入审核意见或驳回原因',
  noteRequired = false,
  approveText = '审核通过',
  rejectText = '驳回',
}) => {
  const [note, setNote] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  const handleAction = async (decision: ReviewDecision) => {
    if (noteRequired && !note.trim()) {
      // 简单提示，不引入 MessagePlugin 到通用层
      alert('请填写审核意见');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(decision, note.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      header={title}
      visible={visible}
      onClose={onClose}
      confirmBtn={{ content: approveText, theme: 'primary', loading }}
      cancelBtn={{ content: rejectText, theme: 'danger', loading }}
      onConfirm={() => handleAction('approved')}
      onCancel={() => handleAction('rejected')}
      width={480}
    >
      <div style={{ padding: '8px 0' }}>
        <Textarea
          value={note}
          onChange={setNote}
          placeholder={notePlaceholder}
          rows={4}
          maxlength={500}
        />
      </div>
    </Dialog>
  );
};
