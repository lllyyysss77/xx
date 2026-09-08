/**
 * 账号管理接口
 * 后端路由: /admin/accounts
 */
import request from './client';

export interface Account {
  id: string;
  phone: string;
  displayName: string;
  status: 'active' | 'disabled';
  role: string;
  organizationId: string;
  organizationName: string;
  createdAt: string;
}

// 账号列表（按 organizationId 过滤）
export const getAccounts = (params?: { organizationId?: string }): Promise<Account[]> =>
  request.get('/admin/accounts', { params });

// 秘密创建分配账号（初始密码默认 123456）
export const createAccount = (payload: {
  phone: string;
  displayName: string;
  organizationId: string;
  role: string;
}): Promise<Account> => request.post('/admin/accounts', payload);

// 重置密码（重置为 123456）
export const resetPassword = (accountId: string): Promise<void> =>
  request.put(`/admin/accounts/${accountId}/reset-password`);

// 切换启用/停用状态
export const toggleAccountStatus = (accountId: string, status: 'active' | 'disabled'): Promise<void> =>
  request.put(`/admin/accounts/${accountId}/status`, { status });

// 归属地列表（超管）
export interface Organization {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
}
export const getOrganizations = (): Promise<Organization[]> =>
  request.get('/admin/organizations');

// 批量预设账号（解锁码校验，超管/子管理可用）
export interface PresetAccountInput {
  name?: string;
  phone: string;
  roleKey: 'sub_admin' | 'editor' | 'reviewer';
  password?: string;
}
export interface PresetResult {
  created: string[];
  updated: string[];
  skipped: { phone: string; reason: string }[];
  orgId: string;
  orgName: string;
}
export const presetAccounts = (payload: {
  unlockCode: string;
  orgId: string;
  accounts: PresetAccountInput[];
}): Promise<PresetResult> => request.post('/admin/accounts/preset', payload);
