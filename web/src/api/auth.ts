/**
 * 认证相关接口
 * 后端路由: /auth/*
 */
import request from './client';

export interface LoginPayload {
  phone: string;
  password: string;
  organizationId: string;
}

/** 前端归一化后的登录用户 */
export interface LoginUser {
  id?: string;
  phone: string;
  displayName: string;
  name?: string;
  orgId?: string;
  organizationId: string;
  organizationName?: string;
  orgName?: string;
  orgType: 'village' | 'community';
  role: string;
  permissions: string[];
}

/** 后端 /auth/admin/login 的真实扁平返回（client 已做 snake→camel） */
export interface LoginResult {
  token: string;
  expiresAt: string;
  organizationId: string;
  role: string;
  orgName: string;
  orgType: 'village' | 'community';
  slug: string;
  displayName: string;
  permissions: string[];
}

export interface OrgItem {
  id: string;
  name: string;
  slug: string;
  orgType: 'village' | 'community';
  status: string;
}

/** 后台管理员登录：归属地 + 手机号 + 密码 三要素 */
export const login = (payload: LoginPayload): Promise<LoginResult> =>
  request.post('/auth/admin/login', payload);

/** 全部活跃归属地（登录页村/社双轨下拉） */
export const getOrganizations = (): Promise<OrgItem[]> => request.get('/auth/organizations');

/** 退出登录 */
export const logout = (): Promise<void> => request.post('/auth/logout');
