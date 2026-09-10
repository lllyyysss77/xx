import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Select,
  Input,
  DateRangePicker,
  Form,
} from 'tdesign-react';
import { RefreshIcon } from 'tdesign-icons-react';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useElectionStore } from '../../stores/useElectionStore';
import { StatusTag } from '../../components/StatusTag';

const { FormItem } = Form;

/** 按启动时间倒序：最新创建的活动排在最前（后端默认按 d_day 降序返回） */
const newestFirst = (arr: ElectionFief[]) =>
  [...arr].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

export default function ActivitiesPage() {
  const [list, setList] = useState<ElectionFief[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setFief = useElectionStore((s) => s.setFief);

  // 筛选状态
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = newestFirst(await getElectionFiefs());
      setList(data);
      // 默认选中最新启动的活动
      if (data.length > 0) {
        setFief(data[0].id);
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载换届活动失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 计算距离选举日天数
  const calcDaysToDday = (dDay: string) => {
    if (!dDay) return 0;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const target = new Date(`${dDay}T00:00:00Z`);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const columns = [
    // 全部用 width 不用 minWidth：TDesign 会把富余整块塞给 minWidth 列造成名称列虚胖
    { 
      colKey: 'name', 
      title: '活动名称', 
      width: 140, // 减小宽度，压缩视觉占比
      cell: ({ row }: any) => (
        <div style={{ lineHeight: '1.4' }}>
          {row.name.length > 12 ? (
            <>
              {row.name.slice(0, 10)}<br/>{row.name.slice(10)}
            </>
          ) : row.name}
        </div>
      )
    },
    {
      colKey: 'dDay',
      title: '选举日',
      width: 150,
      cell: ({ row }: any) => {
        const days = calcDaysToDday(row.dDay);
        return (
          <Space direction="vertical" size={2}>
            <strong style={{ color: 'var(--color-primary)' }}>{row.dDay}</strong>
            <span style={{ fontSize: 12, color: days >= 0 ? 'var(--color-success)' : 'var(--text-3)' }}>
              {days > 0 ? `还有 ${days} 天` : days === 0 ? '今日投票' : `已结束 ${Math.abs(days)} 天`}
            </span>
          </Space>
        );
      },
    },
    {
      colKey: 'status',
      title: '状态',
      width: 80,
      cell: ({ row }: any) => <StatusTag type="election" status={row.status} />,
    },
    {
      colKey: 'createdAt',
      title: '启动日期',
      width: 106,
      // ISO 串只给机器看；人看的永远是本地短日期（杜绝 2026-09-09T06:52:27.860Z 甩脸上）
      cell: ({ row }: any) => (
        <span style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{String(row.createdAt || '').slice(0, 10)}</span>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 150,
      cell: ({ row }: any) => (
        <Button
          theme="primary"
          variant="base"
          size="large" // 改为 large，确保阿姨点得准
          style={{ padding: '0 24px', height: '40px', fontSize: '14px' }} // 明确放大尺寸
          onClick={() => {
            setFief(row.id);
            navigate(`/election/activity/${row.id}`);
          }}
        >
          进入工作台
        </Button>
      ),
    },
  ];

  // 筛选后的列表（关键词匹配活动名称；日期区间按法定选举日 dDay 过滤）
  const filteredList = useMemo(() => {
    // 统一转小写并去除首尾空格，避免大小写/空格导致搜不到
    const kw = keyword.trim().toLowerCase();
    return list.filter((a) => {
      if (kw && !a.name?.toLowerCase().includes(kw)) return false;
      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const d = a.dDay || '';
        if (d < dateRange[0] || d > dateRange[1]) return false;
      }
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    });
  }, [list, keyword, dateRange, statusFilter]);

  // 全系统数据天然嵌套在登录归属地(organization)之下，前端不再重复展示归属地名。

  const resetFilters = () => {
    setKeyword('');
    setDateRange([]);
    setStatusFilter('');
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="换届活动档案列表"
        description="换届活动由【选举提案】审核通过后单事务自动初始化生成。此处展示本归属地历届与当届选举实体。"
      >
        {/* 筛选条：关键词 / 选举日区间 / 状态 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <FormItem label="关键词">
            <Input
              clearable
              placeholder="搜索活动名称"
              value={keyword}
              onChange={(v: string) => setKeyword(v || '')}
              style={{ width: 200 }}
            />
          </FormItem>
          <FormItem label="选举日区间">
            <DateRangePicker
              clearable
              placeholder={['开始日期', '结束日期']}
              value={dateRange}
              onChange={(v: any) => {
                // 统一规整为 'YYYY-MM-DD' 字符串，保证与 dDay 同格式可比较
                const arr: any[] = Array.isArray(v) ? v : [];
                setDateRange(
                  arr.map((d) => {
                    if (!d) return '';
                    if (typeof d === 'string') return d.slice(0, 10);
                    const dt = d instanceof Date ? d : new Date(d);
                    const m = String(dt.getMonth() + 1).padStart(2, '0');
                    const day = String(dt.getDate()).padStart(2, '0');
                    return `${dt.getFullYear()}-${m}-${day}`;
                  }),
                );
              }}
              style={{ width: 260 }}
            />
          </FormItem>
          <FormItem label="状态">
            <Select
              clearable
              placeholder="全部状态"
              value={statusFilter}
              options={[
                { label: '筹备中', value: 'draft' },
                { label: '进行中', value: 'active' },
                { label: '已归档', value: 'closed' },
              ]}
              onChange={(v: any) => setStatusFilter(v || '')}
              style={{ width: 140 }}
            />
          </FormItem>
          <FormItem>
            <Button variant="outline" icon={<RefreshIcon />} onClick={resetFilters}>
              重置
            </Button>
          </FormItem>
          <FormItem>
            <span style={{ color: '#888', fontSize: 13 }}>共 {filteredList.length} 条</span>
          </FormItem>
        </Form>

        <Table
          data={filteredList}
          columns={columns}
          rowKey="id"
          loading={loading}
          empty="暂无符合条件的换届活动，请调整筛选条件后重试"
        />
      </Card>
    </div>
  );
}
