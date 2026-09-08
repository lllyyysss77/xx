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

  // 秘密开账号弹窗
  const [createVisible, setCreateVisible] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState('sub_admin');
  const [newOrgId, setNewOrgId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // 提交秘密开通账号
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

      MessagePlugin.success('账号开通成功！初始密码默认已设为 123456');
      setCreateVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '开通账号失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 重置初始密码 123456
  const handleResetPassword = async (account: Account) => {
    try {
      await resetPassword(account.id);
      MessagePlugin.success(`已成功将【${account.displayName || account.phone}】密码重置为初始密码 123456`);
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
      width: 160,
      cell: ({ row }: any) => (
        <Space size="small">
          <UserIcon style={{ color: '#0052d9' }} />
          <strong>{row.displayName || '（未设）'}</strong>
        </Space>
      ),
    },
    { colKey: 'phone', title: '手机号 (登录账号)', width: 140 },
    { colKey: 'organizationName', title: '归属村居单位', width: 180 },
    {
      colKey: 'role',
      title: '行政职务角色',
      width: 200,
      cell: ({ row }: any) => {
        const r = ROLE_MAP[row.role] || { name: row.role, theme: 'default' };
        return <Tag theme={r.theme} variant="light">{r.name}</Tag>;
      },
    },
    {
      colKey: 'status',
      title: '账号状态',
      width: 110,
      cell: ({ row }: any) => <StatusTag type="account" status={row.status} />,
    },
    { colKey: 'createdAt', title: '开通时间', width: 160 },
    {
      colKey: 'op',
      title: '管理操作',
      width: 200,
      cell: ({ row }: any) => (
        <Space>
          <Popconfirm
            content={`确认将该账号密码重置为 123456 吗？`}
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
        description="内部工作账号严禁公开注册，均由区平台超级管理员或各村居选委会负责人按行政权责统一开通，初始密码统一为 123456。"
        actions={
          <Space>
            {isPlatformAdmin && (
              <Select
                style={{ width: 220 }}
                value={selectedOrgId}
                onChange={(v: any) => setSelectedOrgId(v)}
                placeholder="按归属地筛选"
                clearable
                options={orgs.map((o) => ({ label: `${o.orgType === 'community' ? '🏘' : '🏡'} ${o.name}`, value: o.id }))}
              />
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

      {/* 秘密开通内部账号 Dialog */}
      <Dialog
        header="秘密开通村居工作账号"
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
              options={orgs.map((o) => ({ label: `${o.orgType === 'community' ? '🏘 社区' : '🏡 行政村'} · ${o.name}`, value: o.id }))}
              placeholder="请指定归属地（一旦分配终身绑死）"
              disabled={!isPlatformAdmin}
            />
          </FormItem>

          <FormItem label="分配行政角色" requiredMark>
            <Select
              value={newRole}
              onChange={(v: any) => setNewRole(v)}
              options={[
                { label: '村居子管理员（选委会主任/全面管辖）', value: 'sub_admin' },
                { label: '经办编辑（选委会工作人员/干活小编）', value: 'editor' },
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
            🔒 安全机制：新账号开通后默认登录密码统一设为 <strong>123456</strong>。工作人员首次登录后，可在工作台顶部自主修改密码。
          </div>
        </Form>
      </Dialog>
    </div>
  );
}
