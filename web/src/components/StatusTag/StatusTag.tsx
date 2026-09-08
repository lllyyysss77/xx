/**
 * 统一状态标签组件
 * —— 所有状态 Tag 的颜色、文案集中管理，杜绝页面里各自写
 *
 * 用法:
 *   <StatusTag type="proposal" status="pending" />
 *   <StatusTag type="material" status="approved" />
 */
import React from 'react';
import { Tag } from 'tdesign-react';

type TagTheme = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export type StatusType =
  | 'proposal'      // 提案: pending/approved/rejected
  | 'election'      // 活动: draft/active/closed
  | 'material'      // 材料: submitted/approved/rejected
  | 'candidate'     // 候选人: reviewing/approved/rejected
  | 'announcement'  // 公告: draft/published
  | 'account'       // 账号: active/disabled
  | 'stage';        // 阶段: not_started/in_progress/completed

const STATUS_MAP: Record<StatusType, Record<string, { text: string; theme: TagTheme }>> = {
  proposal: {
    pending: { text: '待审核', theme: 'warning' },
    approved: { text: '已通过', theme: 'success' },
    rejected: { text: '已驳回', theme: 'danger' },
  },
  election: {
    draft: { text: '草稿', theme: 'default' },
    active: { text: '进行中', theme: 'primary' },
    closed: { text: '已结束', theme: 'default' },
  },
  material: {
    submitted: { text: '待审核', theme: 'warning' },
    approved: { text: '已通过', theme: 'success' },
    rejected: { text: '已驳回', theme: 'danger' },
  },
  candidate: {
    reviewing: { text: '审核中', theme: 'warning' },
    approved: { text: '正式候选人', theme: 'success' },
    rejected: { text: '已淘汰', theme: 'danger' },
  },
  announcement: {
    draft: { text: '草稿', theme: 'default' },
    published: { text: '已发布', theme: 'success' },
  },
  account: {
    active: { text: '正常', theme: 'success' },
    disabled: { text: '停用', theme: 'danger' },
  },
  stage: {
    not_started: { text: '未开始', theme: 'default' },
    in_progress: { text: '进行中', theme: 'primary' },
    completed: { text: '已完成', theme: 'success' },
  },
};

interface StatusTagProps {
  type: StatusType;
  status: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ type, status }) => {
  const cfg = STATUS_MAP[type]?.[status];
  if (!cfg) return <Tag>{status}</Tag>;
  return <Tag theme={cfg.theme} variant="light">{cfg.text}</Tag>;
};
