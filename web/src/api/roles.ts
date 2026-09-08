/**
 * 角色与权限接口
 * 后端路由: /admin/roles & /admin/role-permissions
 */
import request from './client';

export interface Role {
  key: string;
  name: string;
  isStaff: boolean;
  isSystem: boolean;
  createdAt: string;
  permissions?: string[];
}

// 获取全部角色（含权限点列表）
export const getRoles = (): Promise<Role[]> => request.get('/admin/roles');

// 新建角色
export const createRole = (role: { key: string; name: string; permissions: string[] }): Promise<Role> =>
  request.post('/admin/roles', role);

// 更新角色权限
export const updateRolePermissions = (roleKey: string, permissions: string[]): Promise<void> =>
  request.patch(`/admin/roles/${roleKey}`, { permissions });

// 删除角色（系统内置角色禁删，后端会 400 报错）
export const deleteRole = (roleKey: string): Promise<void> =>
  request.delete(`/admin/roles/${roleKey}`);
