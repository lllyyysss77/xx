import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Divider,
} from 'tdesign-react';
import {
  CalendarIcon,
  FolderIcon,
  UserIcon,
  NotificationIcon,
  FileAddIcon,
  BrowseIcon,
  CheckCircleIcon,
  TimeIcon,
} from 'tdesign-icons-react';
import { getProposals, Proposal } from '../../api/proposals';
import { getMaterials, Material } from '../../api/materials';
import { getCandidates, Candidate } from '../../api/candidates';
import { getAnnouncements, Announcement } from '../../api/announcements';
import { getPositions, Position } from '../../api/positions';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { StatusTag } from '../../components/StatusTag';

export default function DashboardPage() {
  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  /* 键盘可达跳转（政务无障碍验收）：鼠标点、Tab 聚焦、Enter/空格 均可触发 */
  const go = (path: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    style: { cursor: 'pointer' },
    onClick: () => navigate(path),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(path);
      }
    },
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getElectionFiefs(),
      getProposals(),
      getMaterials(),
      getCandidates(),
      getAnnouncements(),
      getPositions(),
    ])
      .then(([fiefData, propData, matData, candData, annData, posData]) => {
        setFiefs(fiefData);
        setProposals(propData);
        setMaterials(matData);
        setCandidates(candData);
        setAnnouncements(annData);
        setPositions(posData);
      })
      .catch((err: any) => {
        MessagePlugin.error(err.message || '加载工作台统计失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const currentFief = fiefs[0];

  // 待办事项汇总联动
  const pendingProposals = proposals.filter((p) => p.status === 'pending');
  const submittedMaterials = materials.filter((m) => m.status === 'submitted');
  const reviewingCandidates = candidates.filter((c) => c.status === 'reviewing');
  const draftAnnouncements = announcements.filter((a) => a.status === 'draft');

  const todoList = [
    ...pendingProposals.map((p) => ({
      id: `prop-${p.id}`,
      type: '提案待审批',
      name: p.name,
      time: p.createdAt,
      link: '/election/proposals',
      theme: 'warning',
    })),
    ...submittedMaterials.map((m) => ({
      id: `mat-${m.id}`,
      type: '参选材料待初审',
      name: `${m.candidateName || m.candidatePhone} 提交的资格材料`,
      time: m.submittedAt,
      link: '/election/materials',
      theme: 'primary',
    })),
    ...reviewingCandidates.map((c) => ({
      id: `cand-${c.id}`,
      type: '线下联审待回填',
      name: `${c.candidateName || c.candidatePhone}（当前${c.currentRound}）`,
      time: c.createdAt,
      link: '/election/candidates',
      theme: 'success',
    })),
    ...draftAnnouncements.slice(0, 5).map((a) => ({
      id: `ann-${a.id}`,
      type: '法定公文待发布',
      name: a.title,
      time: a.createdAt,
      link: a.electionFiefId ? `/election/activity/${a.electionFiefId}` : '/election/activities',
      theme: 'default',
    })),
  ];

  const todoColumns = [
    {
      colKey: 'type',
      title: '事项类型',
      width: 150,
      cell: ({ row }: any) => <Tag theme={row.theme} variant="light">{row.type}</Tag>,
    },
    {
      colKey: 'name',
      title: '事项内容 / 待办标的',
      width: 320,
      cell: ({ row }: any) => <span style={{ fontWeight: 500 }}>{row.name}</span>,
    },
    { colKey: 'time', title: '产生时间', width: 160 },
    {
      colKey: 'op',
      title: '操作',
      width: 120,
      cell: ({ row }: any) => (
        <Button
          theme="primary"
          variant="text"
          size="small"
          onClick={() => navigate(row.link)}
        >
          前往处理
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 顶部欢迎卡片 */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #eef4ff 0%, #ffffff 100%)' }}>
        <Row align="middle" justify="space-between">
          <Col span={16}>
            <h2 style={{ margin: 0, fontSize: 22, color: '#1d2129' }}>
              您好，{user?.displayName || user?.phone} · {user?.orgName || '城厢区村居换届工作台'}
            </h2>
            <div style={{ color: '#4e5969', fontSize: 13, marginTop: 8 }}>
              当前职务权限：
              <Tag theme="primary" variant="light" style={{ marginLeft: 6 }}>
                {user?.role === 'platform_admin'
                  ? '平台超管'
                  : user?.role === 'sub_admin'
                  ? '选委会主任 (子管理)'
                  : user?.role === 'reviewer'
                  ? '审核人'
                  : '经办编辑'}
              </Tag>
              <span style={{ marginLeft: 16 }}>
                以法定选举日（D 日）倒排驱动 · 村/社区分轨管理
              </span>
            </div>
          </Col>

          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button theme="primary" icon={<FileAddIcon />} onClick={() => navigate('/election/proposals')}>
                发起新提案
              </Button>
              <Button theme="default" icon={<CalendarIcon />} onClick={() => navigate('/election/activities')}>
                活动大厅
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 六大关键指标统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <div {...go('/election/activities')}>
            <Card bordered hoverShadow>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>当届选举活动</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                {fiefs.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>法定选举日已确认，日程已倒排锁定</div>
            </Card>
          </div>
        </Col>
        <Col span={4}>
          <div {...go('/election/positions')}>
            <Card bordered hoverShadow>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>本届拟设岗位</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>
                {positions.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>总拟选职数：{positions.reduce((s, p) => s + (p.quota || 1), 0)} 人</div>
            </Card>
          </div>
        </Col>
        <Col span={4}>
          <div {...go('/election/materials')}>
            <Card bordered hoverShadow>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>报名材料上报</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-warning)', marginTop: 4 }}>
                {materials.length}
              </div>
              <div style={{ fontSize: 12, color: submittedMaterials.length > 0 ? 'var(--color-warning)' : 'var(--text-3)', marginTop: 4 }}>
                待初审：{submittedMaterials.length} 份
              </div>
            </Card>
          </div>
        </Col>
        <Col span={4}>
          <div {...go('/election/candidates')}>
            <Card bordered hoverShadow>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>候选人联审池</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-success)', marginTop: 4 }}>
                {candidates.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>
                四轮联审中：{reviewingCandidates.length} 人
              </div>
            </Card>
          </div>
        </Col>
        <Col span={4}>
          <div {...go('/election/announcements')}>
            <Card bordered hoverShadow>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>法定公文发文</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                {announcements.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>已发布：{announcements.filter((a) => a.status === 'published').length} 篇</div>
            </Card>
          </div>
        </Col>
        <Col span={4}>
          <div {...go('/election/proposals')}>
            <Card bordered hoverShadow>
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>换届选举提案</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                {proposals.length}
              </div>
              <div style={{ fontSize: 12, color: pendingProposals.length > 0 ? 'var(--color-warning)' : 'var(--text-3)', marginTop: 4 }}>
                待审批：{pendingProposals.length} 项
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      {/* 待办事项全流程联动看板 */}
      <Card
        title="实时法定业务待办事项"
        description="全模块待办自动汇总。所有事项均由 D-day 法定时间节点依法触发。"
      >
        <Table data={todoList} columns={todoColumns} rowKey="id" loading={loading} />
      </Card>
    </div>
  );
}
