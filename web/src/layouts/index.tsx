import React, { memo } from 'react';
import { Drawer, Layout } from 'tdesign-react';
import { useLocation } from 'react-router-dom';
import Setting from './components/Setting';
import SideShell from './components/AppLayout';
import Login from 'pages/Login';
import { useUiStore } from 'stores/useUiStore';
import Style from './index.module.less';

/**
 * 应用外壳：固定侧边栏布局。
 * /login 为全屏页（无侧栏/头部）；其余业务页统一走 SideShell。
 * 界面偏好来自 zustand useUiStore（已移除 redux global）。
 */
export default memo(() => {
  const { pathname } = useLocation();
  const setting = useUiStore((s) => s.setting);
  const toggleSetting = useUiStore((s) => s.toggleSetting);
  const isFullPage = pathname === '/login';

  return (
    <Layout className={Style.panel}>
      {isFullPage ? <Login /> : <SideShell />}
      {!isFullPage && (
        <Drawer
          destroyOnClose
          visible={setting}
          size="458px"
          footer={false}
          header="页面设置"
          onClose={toggleSetting}
        >
          <Setting />
        </Drawer>
      )}
    </Layout>
  );
});
