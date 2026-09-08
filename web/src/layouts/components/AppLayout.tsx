import React, { memo } from 'react';
import { Layout } from 'tdesign-react';
import classnames from 'classnames';
import Header from './Header';
import Footer from './Footer';
import Menu from './Menu';
import Content from './AppRouter';

import Style from './AppLayout.module.less';

/** 政务后台固定侧边栏布局（移除 starter 的 top/mix 多布局切换） */
const SideLayout = memo(() => (
  <Layout className={classnames(Style.sidePanel, 'narrow-scrollbar')}>
    <Menu showLogo showOperation />
    <Layout className={Style.sideContainer}>
      <Header />
      <Content />
      <Footer />
    </Layout>
  </Layout>
));

export default SideLayout;
