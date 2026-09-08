/**
 * 路由守卫
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  perm?: string;
  roles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, perm, roles }) => {
  const { token, user, hasPerm, hasRole } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user?.role === 'platform_admin') {
    return <>{children}</>;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#999' }}>
        <h2>403 · 无权限访问</h2>
        <p>您的职务角色暂无此页面访问权限。</p>
      </div>
    );
  }

  if (perm && !hasPerm(perm)) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#999' }}>
        <h2>403 · 无权限访问</h2>
        <p>您的账号暂无此操作权限点（{perm}），请联系系统管理员。</p>
      </div>
    );
  }

  return <>{children}</>;
};
