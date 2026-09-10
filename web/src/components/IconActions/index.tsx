/**
 * 表格操作列：图标按钮组（带 tooltip）
 *
 * 夏夏 2026-09-10：操作列不要一排文字按钮，用图标 + 悬停提示；
 * 危险操作（删除/驳回）自动用印章红。风格对齐 FileList 的图标操作范式。
 *
 * 用法：
 *   cell: ({ row }) => (
 *     <IconActions items={[
 *       { icon: <BrowseIcon />, title: '预览', onClick: () => preview(row) },
 *       { icon: <DeleteIcon />, title: '删除', danger: true, onClick: () => del(row) },
 *     ]} />
 *   )
 */
import React from 'react';
import { Tooltip, Button } from 'tdesign-react';
import './IconActions.less';

export interface IconAction {
  icon: React.ReactNode;
  /** 悬停提示，必填 —— 大龄用户靠它认图标 */
  title: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** 危险操作：印章红 */
  danger?: boolean;
  disabled?: boolean;
}

export const IconActions: React.FC<{ items: (IconAction | null | undefined)[] }> = ({ items }) => {
  const list = items.filter(Boolean) as IconAction[];
  if (!list.length) return <span style={{ color: 'var(--text-3, #8a909c)', fontSize: 12 }}>—</span>;
  return (
    <div className="icon-actions">
      {list.map((it, i) => (
        <Tooltip key={i} content={it.title} theme="light">
          <Button
            className={'icon-actions__btn' + (it.danger ? ' is-danger' : '')}
            variant="text"
            shape="square"
            size="small"
            disabled={it.disabled}
            icon={it.icon}
            onClick={it.onClick}
            aria-label={it.title}
          />
        </Tooltip>
      ))}
    </div>
  );
};

export default IconActions;
