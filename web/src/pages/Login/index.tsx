import React, { memo } from 'react';
import classNames from 'classnames';
import Login from './components/Login';
import LoginHeader from './components/Header';

import Style from './index.module.less';

/** 登录全屏页：固定浅色主题（已移除 redux global 依赖） */
export default memo(() => (
  <div className={classNames(Style.loginWrapper, Style.light)}>
    <LoginHeader />
    <div className={Style.loginContainer}>
      <div className={Style.titleContainer}>
        <h1 className={Style.title}>城厢区村居换届选举</h1>
        <div className={Style.subTitle}>
          <p className={classNames(Style.tip, Style.registerTip)}>城厢区民政局</p>
        </div>
      </div>
      <Login />
    </div>
    <footer className={Style.copyright}>城厢区村居换届选举系统 · 内部工作台</footer>
  </div>
));
