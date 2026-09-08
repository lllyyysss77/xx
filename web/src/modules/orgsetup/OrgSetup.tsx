import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Dialog,
  Input,
  Select,
  Tag,
  Space,
  MessagePlugin,
  Form,
} from 'tdesign-react';
import {
  AddIcon,
  DeleteIcon,
  LockOnIcon,
  CheckCircleIcon,
} from 'tdesign-icons-react';
import {
  getAccounts,
  getOrganizations,
  presetAccounts,
  Account,
  Organization,
  PresetResult,
} from '../../api/accounts';
import { useAuthStore } from '../../stores/useAuthStore';

const { FormItem } = Form;

const ROLE_OPTIONS = [
  { value: 'sub_admin', label: '选委会主任（子管理）' },
  { value: 'editor', label: '经办编辑' },
  { value: 'reviewer', label: '审核员' },
];

const ROLE_TAG: Record<string, { label: string; theme: 'primary' | 'warning' | 'success' | 'default' }> = {
  sub_admin: { label: '选委会主任', theme: 'primary' },
  editor: { label: '经办编辑', theme: 'warning' },
  reviewer: { label: '审核员', theme: 'success' },
  platform_admin: { label: '平台超管', theme: 'default' },
};

interface PresetRow {
  key: number;
  name: string;
  phone: string;
  roleKey: 'sub_admin' | 'editor' | 'reviewer';
  password: string;
}

let rowSeq = 1;

export default function OrgSetupPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'platform_admin';

  // 解锁状态
  const [unlocked, setUnlocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');

  // 归属地
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState('');

  // 批量预设行
  const [rows, setRows] = useState<PresetRow[]>([
    { key: rowSeq++, name: '', phone: '', roleKey: 'sub_admin', password: '' },
  ]);

  // 现有账号
  const [existing, setExisting] = useState<Account[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // 提交状态
  const [saving, setSaving] = useState(false);

  // 结果弹窗
  const [result, setResult] = useState<PresetResult | null>(null);

  // 加载归属地列表（超管）
  useEffect(() => {
    if (isAdmin) {
      getOrganizations()
        .then(setOrgs)
        .catch(() => MessagePlugin.error('归属地列表加载失败'));
    }
  }, [isAdmin]);

  // 加载某归属地现有账号
  const loadExisting = useCallback(async (oid: string) => {
    if (!oid) return;
    setLoadingExisting(true);
    try {
      const list = await getAccounts({ organizationId: oid });
      setExisting(list || []);
    } catch {
      MessagePlugin.error('现有账号加载失败');
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  const onOrgChange = (v: string) => {
    setOrgId(v);
    loadExisting(v);
  };

  // 行操作
  const addRow = () =>
    setRows((r) => [...r, { key: rowSeq++, name: '', phone: '', roleKey: 'sub_admin', password: '' }]);

  const delRow = (key: number) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== key) : r));

  const updRow = (key: number, patch: Partial<PresetRow>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  // 保存预设
  const onSave = async () => {
    if (!orgId) {
      MessagePlugin.warning('请先选择归属地');
      return;
    }
    const valid = rows.filter((r) => r.phone.trim() || r.name.trim());
    if (!valid.length) {
      MessagePlugin.warning('至少填写一个账号');
      return;
    }
    for (const r of valid) {
      if (!/^1\d{10}$/.test(r.phone.trim())) {
        MessagePlugin.warning(`手机号格式不对：${r.phone || '(空)'}`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await presetAccounts({
        unlockCode,
        orgId,
        accounts: valid.map((r) => ({
          name: r.name.trim() || undefined,
          phone: r.phone.trim(),
          roleKey: r.roleKey,
          password: r.password.trim() || undefined,
        })),
      });
      setResult(res);
      MessagePlugin.success(
        `预设完成：新增 ${res.created.length} · 更新 ${res.updated.length} · 跳过 ${res.skipped.length}`,
      );
      setRows([{ key: rowSeq++, name: '', phone: '', roleKey: 'sub_admin', password: '' }]);
      loadExisting(orgId);
    } catch (e: any) {
      MessagePlugin.error(e?.message || '预设失败，请检查解锁码');
    } finally {
      setSaving(false);
    }
  };

  // 非超管提示
  if (!isAdmin) {
    return (
      <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
        <Card bordered title="归属地账号预设">
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#888' }}>
            <LockOnIcon style={{ fontSize: 48, marginBottom: 16 }} />
            <h3>仅平台超管可访问</h3>
            <p style={{ marginTop: 8 }}>此页面用于为村/社区预设登录账号，请使用平台超管账号登录后访问。</p>
          </div>
        </Card>
      </div>
    );
  }

  const existingCols = [
    { colKey: 'displayName', title: '姓名', width: 120, cell: ({ row }: any) => row.displayName || row.phone },
    { colKey: 'phone', title: '手机号', width: 140 },
    {
      colKey: 'role',
      title: '角色',
      width: 140,
      cell: ({ row }: any) => {
        const m = ROLE_TAG[row.role] || { label: row.role || '未分配', theme: 'default' as const };
        return <Tag theme={m.theme} variant="light" size="small">{m.label}</Tag>;
      },
    },
    {
      colKey: 'status',
      title: '状态',
      width: 100,
      cell: ({ row }: any) => (
        <Tag theme={row.status === 'active' ? 'success' : 'default'} variant="outline" size="small">
          {row.status === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      width: 170,
      cell: ({ row }: any) => String(row.createdAt || '').slice(0, 16).replace('T', ' '),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
      <Card
        bordered
        title="归属地账号预设（超管隐藏页）"
        description="为村/社区预设登录账号：选委会主任 / 经办编辑 / 审核员，初始密码默认 123456。预设后前端即可用「归属地 + 手机号 + 密码」登录对应后台。"
      >
        {!unlocked ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 16 }}>
              <LockOnIcon style={{ marginRight: 8 }} /> 请输入超管解锁码
            </div>
            <Space>
              <Input
                type="password"
                value={unlockCode}
                onChange={(v) => setUnlockCode(String(v))}
                placeholder="解锁码（默认 123456，后端校验）"
                style={{ width: 320 }}
              />
              <Button theme="primary" disabled={!unlockCode} onClick={() => setUnlocked(true)}>
                解锁进入
              </Button>
            </Space>
            <div style={{ color: '#999', fontSize: 12, marginTop: 12 }}>
              解锁码不在前端校验对错，提交预设时由后端二次校验，错误会提示。
            </div>
          </div>
        ) : (
          <>
            {/* ① 选择归属地 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>
                ① 选择归属地
              </div>
              <Select
                value={orgId}
                onChange={(v: any) => onOrgChange(String(v))}
                placeholder="请选择村 / 社区"
                style={{ width: 360 }}
                options={orgs.map((o) => ({
                  value: o.id,
                  label: `${o.name}（${o.slug}）`,
                }))}
              />
            </div>

            {/* ② 添加账号（可批量） */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>
                ② 添加账号（可批量）
              </div>
              <div
                style={{
                  border: '1px solid #E8E5E0',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    background: '#F5F3F0',
                    padding: '10px 12px',
                    fontWeight: 600,
                    fontSize: 13,
                    borderBottom: '1px solid #E8E5E0',
                  }}
                >
                  <span style={{ width: 180 }}>角色</span>
                  <span style={{ width: 160 }}>姓名（可选）</span>
                  <span style={{ width: 200 }}>手机号</span>
                  <span style={{ width: 180 }}>密码（留空=123456）</span>
                  <span style={{ width: 60 }}>操作</span>
                </div>
                {rows.map((r) => (
                  <div
                    key={r.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: '1px solid #F0EDE8',
                      gap: 10,
                    }}
                  >
                    <Select
                      value={r.roleKey}
                      onChange={(v: any) => updRow(r.key, { roleKey: v })}
                      style={{ width: 180 }}
                      options={ROLE_OPTIONS}
                    />
                    <Input
                      value={r.name}
                      onChange={(v) => updRow(r.key, { name: String(v) })}
                      placeholder="如：林建国"
                      style={{ width: 160 }}
                    />
                    <Input
                      value={r.phone}
                      onChange={(v) => updRow(r.key, { phone: String(v) })}
                      placeholder="11 位手机号"
                      style={{ width: 200 }}
                      maxlength={11}
                    />
                    <Input
                      value={r.password}
                      onChange={(v) => updRow(r.key, { password: String(v) })}
                      placeholder="默认 123456"
                      style={{ width: 180 }}
                    />
                    <Button
                      theme="danger"
                      variant="text"
                      disabled={rows.length === 1}
                      onClick={() => delRow(r.key)}
                      icon={<DeleteIcon />}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                <Button theme="default" variant="dashed" icon={<AddIcon />} onClick={addRow}>
                  ＋ 添加一行
                </Button>
                <Button theme="primary" loading={saving} onClick={onSave} icon={<CheckCircleIcon />}>
                  保存预设
                </Button>
              </div>
            </div>

            {/* ③ 该归属地现有账号 */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 10 }}>
                ③ 该归属地现有账号
              </div>
              <Table
                data={existing}
                columns={existingCols}
                rowKey="id"
                loading={loadingExisting}
                size="small"
                bordered
              />
            </div>
          </>
        )}
      </Card>

      {/* 预设结果弹窗 */}
      <Dialog
        header="预设结果"
        visible={!!result}
        onClose={() => setResult(null)}
        footer={
          <Button theme="primary" onClick={() => setResult(null)}>
            知道了
          </Button>
        }
        width={480}
      >
        {result && (
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div>
              <Tag theme="success" variant="light">新增 {result.created.length}</Tag>
              <span style={{ marginLeft: 8 }}>{result.created.join('、') || '—'}</span>
            </div>
            <div>
              <Tag theme="primary" variant="light">更新 {result.updated.length}</Tag>
              <span style={{ marginLeft: 8 }}>{result.updated.join('、') || '—'}</span>
            </div>
            <div>
              <Tag theme="warning" variant="light">跳过 {result.skipped.length}</Tag>
            </div>
            {result.skipped.map((s) => (
              <div key={s.phone} style={{ fontSize: 12, color: '#888', paddingLeft: 8 }}>
                · {s.phone}：{s.reason}
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
