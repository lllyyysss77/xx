/**
 * 按钮与功能级权限门禁组件
 * —— 支持根据 permission 点或 role 角色联合校验
 */
import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

interface PermGateProps {
  /** 需要的权限点代码 (如 'proposal:review') */
  perm?: string;
  /** 需要的角色之一 (如 ['platform_admin', 'sub_admin']) */
  roles?: string[];
  /** 校验通过时渲染 */
  children: React.ReactNode;
  /** 校验失败时渲染 (默认 null) */
  fallback?: React.ReactNode;
}

export const PermGate: React.FC<PermGateProps> = ({ perm, roles, children, fallback = null }) => {
  const { hasPerm, hasRole, user } = useAuthStore();

  if (user?.role === 'platform_admin') {
    return <>{children}</>;
  }

  let passed = true;
  if (roles && roles.length > 0) {
    passed = passed && hasRole(...roles);
  }
  if (perm) {
    passed = passed && hasPerm(perm);
  }

  return passed ? <>{children}</> : <>{fallback}</>;
};

export function usePerm(perm?: string, roles?: string[]): boolean {
  const { hasPerm, hasRole, user } = useAuthStore();
  if (user?.role === 'platform_admin') return true;
  let passed = true;
  if (roles && roles.length > 0) passed = passed && hasRole(...roles);
  if (perm) passed = passed && hasPerm(perm);
  return passed;
}
