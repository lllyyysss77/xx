/**
 * 表格单元格文本：正文 + 小字副信息 + 超长截断「查看更多」
 *
 * 解决三件事（夏夏 2026-09-10）：
 *   1. 长文本不再横向撑破表格 —— 默认按 maxLines 换行截断
 *   2. 超长时点「查看更多」弹窗看全文，不跳页
 *   3. main + sub 双行排版：正文 13.5px 深色，副信息 12px 灰
 *
 * 用法（表格 columns 的 cell 里）：
 *   cell: ({ row }) => <CellText main={row.title} sub={`提交于 ${row.createdAt}`} />
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dialog } from 'tdesign-react';
import './CellText.less';

export interface CellTextProps {
  /** 主文本（可换行、可截断） */
  main: React.ReactNode;
  /** 副信息小字（时间、来源、编号等），不参与截断 */
  sub?: React.ReactNode;
  /** 最大行数，默认 2 */
  maxLines?: number;
}

export const CellText: React.FC<CellTextProps> = ({ main, sub, maxLines = 2 }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);
  const [open, setOpen] = useState(false);

  // 测量截断状态：内容实际高度超出 clamp 高度才显示「查看更多」
  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    setClamped(el.scrollHeight - el.clientHeight > 2);
  }, []);

  useLayoutEffect(measure, [main, sub, maxLines, measure]);

  // 列宽随窗口变化会改变截断状态，需要重测
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const plainText = typeof main === 'string' || typeof main === 'number' ? String(main) : '';

  return (
    <div className="cell-text" onClick={(e) => e.stopPropagation()}>
      <div
        ref={boxRef}
        className="cell-text__main"
        style={{ WebkitLineClamp: maxLines }}
        title={plainText || undefined}
      >
        {main}
      </div>
      {sub != null && sub !== '' && <div className="cell-text__sub">{sub}</div>}
      {clamped && (
        <a
          className="cell-text__more"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          查看更多
        </a>
      )}
      <Dialog
        visible={open}
        header="完整内容"
        footer={false}
        width={520}
        onClose={() => setOpen(false)}
      >
        <div className="cell-text__full">{main}</div>
      </Dialog>
    </div>
  );
};

export default CellText;
