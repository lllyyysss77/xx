import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Row,
  Col,
  Select,
  Input,
  DateRangePicker,
  Form,
} from 'tdesign-react';
import { CalendarIcon, BrowseIcon, RefreshIcon } from 'tdesign-icons-react';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { useElectionStore } from '../../stores/useElectionStore';
import { StatusTag } from '../../components/StatusTag';

const { FormItem } = Form;

export default function ActivitiesPage() {
  const [list, setList] = useState<ElectionFief[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const setFief = useElectionStore((s) => s.setFief);

  // 筛选状态
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<(string | number)[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getElectionFiefs();
      setList(data);
      // 默认选中最新进行中的活动
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
    { colKey: 'name', title: '活动名称', width: 280 },
    {
      colKey: 'dDay',
      title: '法定选举日 (D-day)',
      width: 160,
      cell: ({ row }: any) => {
        const days = calcDaysToDday(row.dDay);
        return (
          <Space direction="vertical" size={2}>
            <strong style={{ color: '#0052d9' }}>{row.dDay}</strong>
            <span style={{ fontSize: 12, color: days >= 0 ? '#00a870' : '#888' }}>
              {days > 0 ? `距选举日还有 ${days} 天` : days === 0 ? '🔥 今日正式投票！' : `已结束 ${Math.abs(days)} 天`}
            </span>
          </Space>
        );
      },
    },
    {
      colKey: 'status',
      title: '状态',
      width: 100,
      cell: ({ row }: any) => <StatusTag type="election" status={row.status} />,
    },
    { colKey: 'createdAt', title: '启动时间', width: 160 },
    {
      colKey: 'op',
      title: '操作',
      width: 160,
      cell: ({ row }: any) => (
        <Button
          theme="primary"
          variant="base"
          size="small"
          icon={<BrowseIcon />}
          onClick={() => {
            setFief(row.id);
            navigate(`/election/activity/${row.id}`);
          }}
        >
          进入本届 Pipeline
        </Button>
      ),
    },
  ];

  // 筛选后的列表（关键词匹配活动名称；日期区间按法定选举日 dDay 过滤）
  const filteredList = useMemo(
    () =>
      list.filter((a) => {
        if (keyword && !a.name?.includes(keyword)) return false;
        if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
          const d = a.dDay || '';
          if (d < String(dateRange[0]) || d > String(dateRange[1])) return false;
        }
        if (statusFilter && a.status !== statusFilter) return false;
        return true;
      }),
    [list, keyword, dateRange, statusFilter],
  );

  const currentFief = filteredList[0] || list[0];
  const daysLeft = currentFief ? calcDaysToDday(currentFief.dDay) : 0;

  const resetFilters = () => {
    setKeyword('');
    setDateRange([]);
    setStatusFilter('');
  };

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部醒目看版 */}
      {currentFief && (
        <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)' }}>
          <Row gutter={16} align="middle">
            <Col span={8}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1d2129' }}>
                {currentFief.organizationName} · {currentFief.name}
              </div>
              <div style={{ color: '#4e5969', fontSize: 13, marginTop: 6 }}>
                法律依据：《{user?.orgType === 'community' ? '城市居民委员会组织法' : '村民委员会组织法'}》
              </div>
            </Col>
            <Col span={4}>
              <div style={{ color: '#888', fontSize: 12 }}>正式选举日 (D-day)</div>
              <div style={{ color: '#0052d9', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {currentFief.dDay}
              </div>
            </Col>
            <Col span={4}>
              <div style={{ color: '#888', fontSize: 12 }}>时间倒排状态</div>
              <div style={{ color: daysLeft >= 0 ? '#00a870' : '#888', fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {daysLeft > 0 ? `距选举还有 ${daysLeft} 天` : daysLeft === 0 ? '今日投票！' : '已完结'}
              </div>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Button
                theme="primary"
                size="large"
                icon={<CalendarIcon />}
                onClick={() => navigate(`/election/activity/${currentFief.id}`)}
              >
                查看 14 阶段日程与公文预排
              </Button>
            </Col>
          </Row>
        </Card>
      )}

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
              onChange={(v: any) => setDateRange(v || [])}
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

        <Table data={filteredList} columns={columns} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
}
