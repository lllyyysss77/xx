import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Dialog,
  Checkbox,
  Divider,
} from 'tdesign-react';
import { LockOnIcon, CheckCircleIcon, SettingIcon } from 'tdesign-icons-react';
import { getRoles, updateRolePermissions, Role } from '../../api/roles';
import { useAuthStore } from '../../stores/useAuthStore';

// 权限点按业务域分类字典，必须完整覆盖后端 role_permissions 已定义的全部权限点，
// 否则 PATCH 全量覆盖保存时会把清单外的已授权权限误删。
const PERMISSION_GROUPS = [
  {
    domain: '提案管理域 (proposal)',
    perms: [
      { key: 'proposal:create', name: '发起换届提案' },
      { key: 'proposal:edit', name: '编辑换届提案' },
      { key: 'proposal:review', name: '审批通过/驳回提案' },
    ],
  },
  {
    domain: '报名材料域 (material)',
    perms: [
      { key: 'material:edit', name: '录入/编辑报名材料' },
      { key: 'material:review', name: '审核参选报名材料' },
    ],
  },
  {
    domain: '候选人联审域 (candidate)',
    perms: [
      { key: 'candidate:edit', name: '编辑候选人信息' },
      { key: 'candidate:review', name: '回填线下四轮联审结果' },
    ],
  },
  {
    domain: '公文发文域 (announcement)',
    perms: [
      { key: 'announcement:edit', name: '编辑公文' },
      { key: 'announcement:review', name: '审核公文' },
      { key: 'announcement:publish', name: '确认正式发布法定公文' },
    ],
  },
  {
    domain: '岗位域 (position)',
    perms: [{ key: 'position:manage', name: '岗位与岗位样表管理' }],
  },
  {
    domain: '数据查看 (data)',
    perms: [{ key: 'data:view', name: '查看本归属地业务数据' }],
  },
  {
    domain: '账号域 (account)',
    perms: [
      { key: 'account:create', name: '开通村居工作账号' },
      { key: 'account:manage', name: '管理村居工作账号' },
    ],
  },
  {
    domain: '组织域 (org，仅平台超管)',
    perms: [
      { key: 'org:create', name: '创建归属地组织' },
      { key: 'org:manage', name: '管理归属地组织' },
    ],
  },
  {
    domain: '角色域 (role，仅平台超管)',
    perms: [{ key: 'role:manage', name: '角色权限中枢配置' }],
  },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { user } = useAuthStore();
  const isPlatformAdmin = user?.role === 'platform_admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载系统角色失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // getRoles 已通过 json_agg 带回每个角色的 permissions，无需再请求不存在的单角色端点
  const openConfigModal = (role: Role) => {
    setCurrentRole(role);
    setSelectedPerms(role.permissions || []);
    setConfigVisible(true);
  };

  const handleSavePerms = async () => {
    if (!currentRole) return;
    setSaving(true);
    try {
      await updateRolePermissions(currentRole.key, selectedPerms);
      MessagePlugin.success(`角色【${currentRole.name}】权限配置已生效！`);
      setConfigVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '保存权限配置失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      colKey: 'name',
      title: '系统角色名称',
      width: 220,
      cell: ({ row }: any) => (
        <Space size="small">
          <LockOnIcon style={{ color: '#0052d9' }} />
          <strong style={{ fontSize: 15, color: '#1d2129' }}>{row.name}</strong>
        </Space>
      ),
    },
    {
      colKey: 'key',
      title: '角色标识 (Key)',
      width: 160,
      cell: ({ row }: any) => <span style={{ fontFamily: 'monospace' }}>{row.key}</span>,
    },
    {
      colKey: 'isSystem',
      title: '角色性质',
      width: 130,
      cell: ({ row }: any) => (
        <Tag theme={row.isSystem ? 'primary' : 'default'} variant="light">
          {row.isSystem ? '🔒 内置法定角色' : '自定义角色'}
        </Tag>
      ),
    },
    {
      colKey: 'permissionsCount',
      title: '已授权权限点',
      width: 160,
      cell: ({ row }: any) => (
        <Tag theme="success" variant="light">
          {(row.permissions?.length || 0)} 项业务权限
        </Tag>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 160,
      cell: ({ row }: any) => (
        <Button
          theme="primary"
          variant="text"
          size="small"
          icon={<SettingIcon />}
          disabled={!isPlatformAdmin || row.key === 'platform_admin'}
          onClick={() => openConfigModal(row)}
        >
          {row.key === 'platform_admin' ? '拥有全局特权' : '配置权限点'}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="角色与权限安全中枢"
        description="系统内置 5 类法定行政角色（平台超管、选委会主任、经办编辑、审核人、小程序参选人）。仅平台超级管理员有权微调业务权限点。"
      >
        <Table data={roles} columns={columns} rowKey="key" loading={loading} />
      </Card>

      {/* 权限点勾选配置 Dialog */}
      <Dialog
        header={`配置角色权限 · ${currentRole?.name || ''}`}
        visible={configVisible}
        onClose={() => setConfigVisible(false)}
        confirmBtn={{ content: '保存权限配置', theme: 'primary', loading: saving }}
        onConfirm={handleSavePerms}
        width={680}
      >
        {currentRole && (
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <p style={{ color: '#666', fontSize: 13 }}>
              正在配置角色：<strong style={{ color: '#0052d9' }}>{currentRole.name} ({currentRole.key})</strong>
            </p>

            {PERMISSION_GROUPS.map((grp) => (
              <div key={grp.domain} style={{ marginBottom: 16 }}>
                <Divider align="left">{grp.domain}</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, paddingLeft: 12 }}>
                  {grp.perms.map((p) => {
                    const isChecked = selectedPerms.includes(p.key);
                    return (
                      <Checkbox
                        key={p.key}
                        checked={isChecked}
                        onChange={(val) => {
                          if (val) {
                            setSelectedPerms([...selectedPerms, p.key]);
                          } else {
                            setSelectedPerms(selectedPerms.filter((k) => k !== p.key));
                          }
                        }}
                      >
                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{p.name}</span>
                        <span style={{ color: '#999', fontSize: 12, marginLeft: 4 }}>({p.key})</span>
                      </Checkbox>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}
