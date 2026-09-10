import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Dialog,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Divider,
} from 'tdesign-react';
import { AddIcon, LockOnIcon, UserIcon, RefreshIcon } from 'tdesign-icons-react';
import {
  getAccounts,
  createAccount,
  resetPassword,
  toggleAccountStatus,
  createOrganization,
  Account,
} from '../../api/accounts';
import { getOrganizations, OrgItem } from '../../api/auth';
import { useAuthStore } from '../../stores/useAuthStore';
import { StatusTag } from '../../components/StatusTag';
import { PermGate } from '../../components/PermGate';

const { FormItem } = Form;

const ROLE_MAP: Record<string, { name: string; theme: 'primary' | 'warning' | 'success' | 'default' }> = {
  platform_admin: { name: '平台超级管理员', theme: 'danger' as any },
  sub_admin: { name: '村居子管理员 (选委会主任)', theme: 'primary' },
  editor: { name: '经办编辑 (选委会工作人员)', theme: 'warning' },
  reviewer: { name: '审核人 (联审/指导组代表)', theme: 'success' },
  candidate: { name: '参选人 (小程序端专属)', theme: 'default' },
};

export default function UsersPage() {
  const [list, setList] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // 开通账号弹窗
  const [createVisible, setCreateVisible] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('sub_admin');
  const [newOrgId, setNewOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 自增村居/社区归属地弹窗
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgType, setOrgType] = useState<'village' | 'community'>('village');
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  const { user } = useAuthStore();
  const isPlatformAdmin = user?.role === 'platform_admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const [accData, orgData] = await Promise.all([
        getAccounts(selectedOrgId ? { organizationId: selectedOrgId } : undefined),
        getOrganizations(),
      ]);
      setList(accData);
      setOrgs(orgData);
      if (!newOrgId && orgData.length > 0) {
        setNewOrgId(user?.organizationId || orgData[0].id);
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOrgId]);

  // 打开创建账号弹窗
  const openCreateModal = () => {
    setNewPhone('');
    setNewDisplayName('');
    setNewRole('sub_admin');
    setNewOrgId(user?.organizationId || (orgs[0]?.id || ''));
    setCreateVisible(true);
  };

  // 提交开通账号
  const handleCreateSubmit = async () => {
    if (!newPhone.trim() || !newDisplayName.trim() || !newOrgId) {
      MessagePlugin.error('请完整输入手机号、真实姓名并指定归属地');
      return;
    }
    if (newPhone.trim().length !== 11) {
      MessagePlugin.error('请输入 11 位有效手机号');
      return;
    }

    setSubmitting(true);
    try {
      await createAccount({
        phone: newPhone.trim(),
        displayName: newDisplayName.trim(),
        organizationId: newOrgId,
        role: newRole,
      });

      MessagePlugin.success('账号开通成功，请将初始密码告知本人并提醒其首次登录后修改');
      setCreateVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '开通账号失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 提交自增村社归属地
  const handleCreateOrg = async () => {
    if (!orgName.trim() || !orgSlug.trim()) {
      MessagePlugin.error('请填写村社名称及唯一代号标识（如 xiagao-cun）');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(orgSlug.trim())) {
      MessagePlugin.error('代号标识仅允许小写字母、数字和中划线（如 chengdong-shequ）');
      return;
    }

    setOrgSubmitting(true);
    try {
      const created = await createOrganization({
        name: orgName.trim(),
        slug: orgSlug.trim(),
        orgType,
      });
      MessagePlugin.success(`村社归属地【${created.name}】创建成功！已联动可用于开号`);
      setOrgModalVisible(false);
      setOrgName('');
      setOrgSlug('');
      // 重新拉取并选中新村社
      const orgData = await getOrganizations();
      setOrgs(orgData);
      setNewOrgId(created.id);
    } catch (err: any) {
      MessagePlugin.error(err.message || '新增村社归属地失败');
    } finally {
      setOrgSubmitting(false);
    }
  };

  // 重置为初始密码
  const handleResetPassword = async (account: Account) => {
    try {
      await resetPassword(account.id);
      MessagePlugin.success(`已将【${account.displayName || account.phone}】的密码重置为初始密码`);
    } catch (err: any) {
      MessagePlugin.error(err.message || '重置密码失败');
    }
  };

  // 启停账号
  const handleToggleStatus = async (account: Account) => {
    const nextStatus = account.status === 'active' ? 'disabled' : 'active';
    try {
      await toggleAccountStatus(account.id, nextStatus);
      MessagePlugin.success(`账号已成功${nextStatus === 'active' ? '启用' : '停用'}`);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '切换状态失败');
    }
  };

  const columns = [
    {
      colKey: 'displayName',
      title: '姓名 / 显示名',
      width: 150,
      cell: ({ row }: any) => (
        <Space size="small">
          <UserIcon style={{ color: '#0052d9' }} />
          <strong>{row.displayName || '（未设）'}</strong>
        </Space>
      ),
    },
    { colKey: 'phone', title: '手机号 (登录账号)', width: 128 },
    { colKey: 'organizationName', title: '归属村居单位', width: 148 },
    {
      colKey: 'role',
      title: '行政职务角色',
      width: 186,
      cell: ({ row }: any) => {
        const r = ROLE_MAP[row.role] || { name: row.role, theme: 'default' };
        return <Tag theme={r.theme} variant="light">{r.name}</Tag>;
      },
    },
    {
      colKey: 'status',
      title: '账号状态',
      width: 96,
      cell: ({ row }: any) => <StatusTag type="account" status={row.status} />,
    },
    {
      colKey: 'createdAt',
      title: '开通时间',
      width: 108,
      // [FIXED 2026-09-10] ISO 串直接渲染导致断行（表格硬伤），统一短日期 + nowrap
      cell: ({ row }: any) => (
        <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{String(row.createdAt || '').slice(0, 10) || '—'}</span>
      ),
    },
    {
      colKey: 'op',
      title: '管理操作',
      // [FIXED 2026-09-10] 200 装不下「重置密码 + 停用/启用」双按钮，导致按钮裁半截
      width: 226,
      cell: ({ row }: any) => (
        <Space>
          <Popconfirm
            content={`确认将该账号密码重置为初始密码吗？`}
            onConfirm={() => handleResetPassword(row)}
          >
            <Button theme="primary" variant="text" size="small" icon={<RefreshIcon />}>
              重置密码
            </Button>
          </Popconfirm>

          <Button
            theme={row.status === 'active' ? 'danger' : 'success'}
            variant="text"
            size="small"
            onClick={() => handleToggleStatus(row)}
          >
            {row.status === 'active' ? '停用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="人员与账号管理"
        description="内部工作账号不开放公开注册，由区平台管理员或各村居选委会负责人按职责统一开通；初始密码请线下告知本人。"
        actions={
          <Space>
            {isPlatformAdmin && (
              <>
                <Select
                  style={{ width: 220 }}
                  value={selectedOrgId}
                  onChange={(v: any) => setSelectedOrgId(v)}
                  placeholder="按归属地筛选"
                  clearable
                  options={orgs.map((o) => ({ label: `${o.orgType === 'community' ? '社区' : '村'} · ${o.name}`, value: o.id }))}
                />
                <Button
                  theme="default"
                  variant="outline"
                  icon={<AddIcon />}
                  onClick={() => setOrgModalVisible(true)}
                >
                  新增村社归属地
                </Button>
              </>
            )}
            <PermGate perm="account:create" roles={['platform_admin', 'sub_admin']}>
              <Button theme="primary" icon={<AddIcon />} onClick={openCreateModal}>
                开通内部工作账号
              </Button>
            </PermGate>
          </Space>
        }
      >
        <Table data={list} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* 开通内部账号 Dialog */}
      <Dialog
        header="开通村居工作账号"
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        confirmBtn={{ content: '确认开通并分配密码', theme: 'primary', loading: submitting }}
        onConfirm={handleCreateSubmit}
        width={540}
      >
        <Form labelWidth={130}>
          <FormItem label="归属村居单位" requiredMark>
            <Select
              value={newOrgId}
              onChange={(v: any) => setNewOrgId(v)}
              options={orgs.map((o) => ({ label: `${o.orgType === 'community' ? '社区' : '行政村'} · ${o.name}`, value: o.id }))}
              placeholder="请指定归属地（账号归属分配后不可变更）"
              disabled={!isPlatformAdmin}
            />
          </FormItem>

          <FormItem label="分配行政角色" requiredMark>
            <Select
              value={newRole}
              onChange={(v: any) => setNewRole(v)}
              options={[
                { label: '村居子管理员（选委会主任/全面管辖）', value: 'sub_admin' },
                { label: '经办编辑（选委会工作人员）', value: 'editor' },
                { label: '审核人（上级联审代表/指导组）', value: 'reviewer' },
              ]}
            />
          </FormItem>

          <FormItem label="人员真实姓名" requiredMark>
            <Input
              value={newDisplayName}
              onChange={(v) => setNewDisplayName(v)}
              placeholder="请输入村居干部真实姓名"
            />
          </FormItem>

          <FormItem label="登录手机号" requiredMark>
            <Input
              value={newPhone}
              maxlength={11}
              onChange={(v) => setNewPhone(v)}
              placeholder="请输入11位登录手机号"
            />
          </FormItem>

          <Divider style={{ margin: '16px 0' }} />
          <div style={{ background: '#eef4ff', padding: '10px 14px', borderRadius: 4, color: '#0052d9', fontSize: 13, lineHeight: 1.6 }}>
            安全说明：新账号开通后由系统生成初始密码，请线下告知本人；工作人员首次登录后，可在工作台右上角自主修改密码。
          </div>
        </Form>
      </Dialog>

      {/* 超管自增村社归属地 Dialog */}
      <Dialog
        header="新建村居 / 社区归属地"
        visible={orgModalVisible}
        onClose={() => setOrgModalVisible(false)}
        confirmBtn={{ content: '确认创建并启用', theme: 'primary', loading: orgSubmitting }}
        onConfirm={handleCreateOrg}
        width={480}
      >
        <Form labelWidth={120}>
          <FormItem label="归属地类型" requiredMark>
            <Select
              value={orgType}
              onChange={(v: any) => setOrgType(v)}
              options={[
                { label: '农村行政村', value: 'village' },
                { label: '城市社区', value: 'community' },
              ]}
            />
          </FormItem>

          <FormItem label="村社中文名称" requiredMark>
            <Input
              value={orgName}
              onChange={(v) => setOrgName(v)}
              placeholder="例如：下高村、龙德井社区"
            />
          </FormItem>

          <FormItem label="唯一标识代码" requiredMark>
            <Input
              value={orgSlug}
              onChange={(v) => setOrgSlug(v)}
              placeholder="例如：xiagao-cun、longdejing-shequ (小写英文字母与中划线)"
            />
          </FormItem>

          <div style={{ background: '#fdf6ec', padding: '10px 14px', borderRadius: 4, color: '#e6a23c', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
            规则说明：归属地标识（Slug）创建后不可变更，用于登录页村社定位与数据归属隔离。
          </div>
        </Form>
      </Dialog>
    </div>
  );
}
