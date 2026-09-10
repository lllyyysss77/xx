import React from 'react';
import { Button, Table, Tag } from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react';
import { ElectionFief } from '../../api/elections';
import Style from './index.module.less';

export interface ElectionSessionListProps {
  title: string;
  sub?: string;
  data: ElectionFief[];
  loading?: boolean;
  statLabel?: string;
  statOf?: (fief: ElectionFief) => number | string | React.ReactNode;
  onEnter: (fief: ElectionFief) => void;
  enterText?: string;
  extra?: React.ReactNode;
}

export const ElectionSessionList: React.FC<ElectionSessionListProps> = ({
  title,
  sub,
  data,
  loading = false,
  statLabel,
  statOf,
  onEnter,
  enterText = '查看本届',
  extra,
}) => {
  // 列宽设计（980 基准，主体区 ~730px 可用）：
  // 1) 所有列一律用 width，绝不用 minWidth —— TDesign 在 table-layout:fixed 下会把
  //    富余宽度整块塞给 minWidth 列，名称列因此涨到 280px 装 7 个字；改 width 后
  //    浏览器按比例放大各列，宽度分布才均匀。
  // 2) 表头一律 ≤4 字防换行；操作列按最长按钮文案实算，杜绝溢出截断
  const columns: PrimaryTableCol<ElectionFief>[] = [
    {
      colKey: 'name',
      title: '活动名称',
      width: 200,
      cell: ({ row }) => (
        // 主行活动名 + 副行届次·单位：富余宽度被真实信息填掉，不再假空白
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontWeight: 500, color: '#1d2129' }}>{row.name}</div>
          {(row.termName || row.unitName) && (
            <div style={{ fontSize: 12, color: 'var(--text-3, #86909c)', marginTop: 2 }}>
              {[row.termName, row.unitName].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      colKey: 'dDay',
      title: '选举日',
      width: 120,
      cell: ({ row }) => (
        <span style={{ color: 'var(--color-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {row.dDay || '—'}
        </span>
      ),
    },
    ...(statLabel
      ? [
          {
            colKey: '__stat',
            title: statLabel,
            width: 128,
            cell: ({ row }: { row: ElectionFief }) => (statOf ? statOf(row) : '—'),
          } as PrimaryTableCol<ElectionFief>,
        ]
      : []),
    {
      colKey: 'status',
      title: '状态',
      width: 88,
      cell: ({ row }) => {
        const isAct = row.status === 'active';
        const isClosed = row.status === 'closed';
        return (
          <Tag
            theme={isAct ? 'success' : isClosed ? 'default' : 'warning'}
            variant="light"
          >
            {isAct ? '推进中' : isClosed ? '已归档' : '筹备中'}
          </Tag>
        );
      },
    },
    {
      colKey: 'op',
      title: '操作',
      width: 170,
      cell: ({ row }) => (
        <Button
          variant="base"
          theme="primary"
          size="medium"
          style={{ padding: '0 20px', height: '36px', fontWeight: 600 }}
          onClick={() => onEnter(row)}
        >
          {enterText}
        </Button>
      ),
    },
  ];

  return (
    <div className={Style.wrap}>
      <div className={Style.pageHead}>
        <div>
          <h2 className={Style.pageTitle}>{title}</h2>
          {sub && <div className={Style.sub}>{sub}</div>}
        </div>
        {extra}
      </div>
      <div className={Style.tableBox}>
        <Table
          rowKey="id"
          columns={columns}
          data={data}
          loading={loading}
          bordered
          hover
          empty="暂无换届活动数据，请先由提案审批生成活动"
        />
      </div>
    </div>
  );
};

export default ElectionSessionList;
