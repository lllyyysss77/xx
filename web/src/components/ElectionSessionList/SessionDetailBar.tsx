import React from 'react';
import { Button, Tag } from 'tdesign-react';
import { RollbackIcon } from 'tdesign-icons-react';
import { ElectionFief } from '../../api/elections';
import Style from './index.module.less';

/** 从届名提取届次，如：涧口社区换届 / 第十一届换届 */
export function sessionNo(name: string): string {
  const m = name.match(/(第[一二三四五六七八九十百\d]+届)/);
  return m ? m[1] : name;
}

interface Props {
  fief: ElectionFief;
  onBack: () => void;
  extra?: React.ReactNode;
}

export const SessionDetailBar: React.FC<Props> = ({ fief, onBack, extra }) => {
  return (
    <div className={Style.detailBar}>
      <Button variant="outline" size="small" icon={<RollbackIcon />} onClick={onBack}>
        ← 返回届次列表
      </Button>
      <div className={Style.detailTitle}>
        <strong>{fief.termName || sessionNo(fief.name)}</strong>
        <span className={Style.detailName}>（{fief.name}）</span>
      </div>
      <Tag size="small" theme="primary" variant="light">
        选举日：{fief.dDay || '—'}
      </Tag>
      <Tag
        size="small"
        theme={fief.status === 'active' ? 'success' : fief.status === 'closed' ? 'default' : 'warning'}
        variant="light"
      >
        {fief.status === 'active' ? '推进中' : fief.status === 'closed' ? '已归档' : '筹备中'}
      </Tag>
      {extra && <div className={Style.detailExtra}>{extra}</div>}
    </div>
  );
};
