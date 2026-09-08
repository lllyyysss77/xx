import React from 'react';
import { Button, Table, Tag } from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react';
import { BrowseIcon } from 'tdesign-icons-react';
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
  const columns: PrimaryTableCol<ElectionFief>[] = [
    {
      colKey: 'name',
      title: '换届活动全称（封地）',
      minWidth: 240,
      cell: ({ row }) => (
        <div>
          <div style={{ fontWeight: 500, color: '#1d2129' }}>{row.name}</div>
        </div>
      ),
    },
    {
      colKey: 'dDay',
      title: '正式选举日 (D-day)',
      width: 160,
      cell: ({ row }) => <span style={{ color: '#0052d9', fontWeight: 500 }}>{row.dDay || '—'}</span>,
    },
    ...(statLabel
      ? [
          {
            colKey: '__stat',
            title: statLabel,
            width: 130,
            cell: ({ row }: { row: ElectionFief }) => (statOf ? statOf(row) : '—'),
          } as PrimaryTableCol<ElectionFief>,
        ]
      : []),
    {
      colKey: 'status',
      title: '活动状态',
      width: 110,
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
      width: 140,
      fixed: 'right',
      cell: ({ row }) => (
        <Button
          variant="base"
          theme="primary"
          size="small"
          icon={<BrowseIcon />}
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
          stripe
          hover
          empty="暂无换届活动数据，请先由提案审批生成活动"
        />
      </div>
    </div>
  );
};

export default ElectionSessionList;
