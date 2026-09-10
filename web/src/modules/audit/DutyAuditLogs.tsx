import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
} from 'tdesign-react';
import {
  RefreshIcon,
  TimeIcon,
  UserIcon,
  CheckCircleIcon,
  BrowseIcon,
} from 'tdesign-icons-react';
import {
  getAuditLogs,
  getAuditLogStats,
  AuditLogItem,
  AuditLogStatsItem,
  Organization,
  getOrganizations,
} from '../../api/accounts';
import { useAuthStore } from '../../stores/useAuthStore';

export default function DutyAuditLogsPage() {
  const { user } = useAuthStore();
  const isPlatformAdmin = user?.role === 'platform_admin';

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditLogStatsItem[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const orgParam = selectedOrgId ? { organizationId: selectedOrgId } : undefined;
      const [logData, statsData] = await Promise.all([
        getAuditLogs({ ...orgParam, page: 1, pageSize: 50 }),
        getAuditLogStats(orgParam),
      ]);
      const list = Array.isArray(logData) ? logData : logData.items;
      setLogs(list || []);
      setStats(statsData || []);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载履职留痕记录失败');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (isPlatformAdmin) {
      getOrganizations()
        .then(setOrgs)
        .catch(() => {});
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    loadData();
  }, [selectedOrgId]);

  const statsColumns = [
    {
      colKey: 'userName',
      title: '经办人姓名',
      width: 140,
      cell: ({ row }: any) => (
        <Space size="small">
          <UserIcon style={{ color: '#0052d9' }} />
          <strong>{row.userName || '经办人'}</strong>
        </Space>
      ),
    },
    { colKey: 'phone', title: '手机号', width: 130 },
    { colKey: 'organizationName', title: '归属村居单位', width: 160 },
    {
      colKey: 'activeDays',
      title: '出勤履职天数',
      width: 120,
      cell: ({ row }: any) => (
        <Tag theme="success" variant="light">
          {row.activeDays} 天在岗
        </Tag>
      ),
    },
    {
      colKey: 'totalActions',
      title: '关键动作留痕数',
      width: 140,
      cell: ({ row }: any) => (
        <Tag theme="primary" variant="outline">
          {row.totalActions} 次操作
        </Tag>
      ),
    },
    {
      colKey: 'lastActiveAt',
      title: '最近履职时间 (防旷工凭据)',
      width: 200,
      cell: ({ row }: any) => (
        <span style={{ color: '#0052d9', fontWeight: 500 }}>
          {row.lastActiveAt ? String(row.lastActiveAt).replace('T', ' ').slice(0, 19) : '—'}
        </span>
      ),
    },
  ];

  const logColumns = [
    {
      colKey: 'createdAt',
      title: '留痕时间戳',
      width: 180,
      cell: ({ row }: any) => String(row.createdAt || '').replace('T', ' ').slice(0, 19),
    },
    {
      colKey: 'userName',
      title: '操作人',
      width: 130,
      cell: ({ row }: any) => (
        <Space size="small">
          <span>{row.userName}</span>
          <Tag size="small" variant="light">{row.role}</Tag>
        </Space>
      ),
    },
    { colKey: 'phone', title: '经办手机号', width: 130 },
    { colKey: 'organizationName', title: '所属村社', width: 150 },
    {
      colKey: 'actionTitle',
      title: '法定履职留痕证据',
      width: 280,
      cell: ({ row }: any) => (
        <span style={{ fontWeight: 600, color: '#182433' }}>{row.actionTitle}</span>
      ),
    },
    {
      colKey: 'details',
      title: '凭证细节 (JSON证据链)',
      ellipsis: true,
      cell: ({ row }: any) => (
        <code style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
          {JSON.stringify(row.details || {})}
        </code>
      ),
    },
    { colKey: 'clientIp', title: '接入网络', width: 130 },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 顶部防旷工履职统计卡片 */}
      <Card
        title="经办人员在岗履职与防旷工考勤统计"
        description="依据甲方严管要求，系统记录选委会经办人、工作人员起草公文、张贴发布公文、归档材料证据链，不可篡改、防推诿抵赖。"
        actions={
          <Space>
            {isPlatformAdmin && (
              <Select
                style={{ width: 220 }}
                value={selectedOrgId}
                onChange={(v: any) => setSelectedOrgId(v)}
                placeholder="按归属地过滤"
                clearable
                options={orgs.map((o) => ({ label: o.name, value: o.id }))}
              />
            )}
            <Button icon={<RefreshIcon />} theme="default" onClick={loadData}>
              刷新证据
            </Button>
          </Space>
        }
      >
        <Table
          data={stats}
          columns={statsColumns}
          rowKey="userId"
          loading={statsLoading}
          size="small"
        />
      </Card>

      {/* 详细操作流水 */}
      <Card title="法定履职操作实时审计流水 (不可篡改留痕证据链)">
        <Table
          data={logs}
          columns={logColumns}
          rowKey="id"
          loading={loading}
          size="small"
        />
      </Card>
    </div>
  );
}
