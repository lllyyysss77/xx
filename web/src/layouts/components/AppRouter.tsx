import React, { Suspense, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Loading } from 'tdesign-react';
import { getAllRoutes } from 'plugins';
import { ProtectedRoute } from 'router/ProtectedRoute';
import Page from './Page';
import Style from './AppRouter.module.less';

const { Content } = Layout;

/**
 * 壳内路由：唯一来源是 plugins 注册中心（modules/* 新封地页面）。
 * 每页统一包 ProtectedRoute（登录/角色/权限守卫）与 Page（内容容器+面包屑）。
 */
const AppRouter = () => (
  <Content>
    <Suspense
      fallback={
        <div className={Style.loading}>
          <Loading />
        </div>
      }
    >
      <Routes>
        {getAllRoutes().map((m) => (
          <Route
            key={m.key}
            path={m.path}
            element={
              <ProtectedRoute perm={m.perm} roles={m.roles}>
                <Page breadcrumbs={[m.name]}>
                  <m.component />
                </Page>
              </ProtectedRoute>
            }
          />
        ))}
        <Route path="/" element={<Navigate to="/election/home" replace />} />
        <Route path="*" element={<Navigate to="/election/home" replace />} />
      </Routes>
    </Suspense>
  </Content>
);

export default memo(AppRouter);
