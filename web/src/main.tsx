import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from 'layouts/index';

// tdesign 样式由 index.html CDN 引入，不再本地打包
import './styles/index.less';

// 政务后台固定浅色主题（不保留 starter 深色/换肤）
document.documentElement.setAttribute('theme-mode', 'light');

const env = import.meta.env.MODE || 'development';
const baseRouterName = env === 'site' ? '/starter/react/' : '';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = document.getElementById('app')!;

ReactDOM.createRoot(root).render(
  <BrowserRouter basename={baseRouterName}>
    <App />
  </BrowserRouter>,
);
