import React, { memo } from 'react';
import { Row, Col, Switch } from 'tdesign-react';
import { useUiStore } from 'stores/useUiStore';

import Style from './index.module.less';

/**
 * 页面设置：政务后台固定浅色 + 侧边栏，仅保留元素显隐开关。
 * 移除 starter 的主题模式 / 主题色 / 导航布局切换。
 */
export default memo(() => {
  const showHeader = useUiStore((s) => s.showHeader);
  const showBreadcrumbs = useUiStore((s) => s.showBreadcrumbs);
  const showFooter = useUiStore((s) => s.showFooter);
  const toggleShowHeader = useUiStore((s) => s.toggleShowHeader);
  const toggleShowBreadcrumbs = useUiStore((s) => s.toggleShowBreadcrumbs);
  const toggleShowFooter = useUiStore((s) => s.toggleShowFooter);

  const row = (label: string, value: boolean, onChange: () => void) => (
    <Row justify="space-between" key={label}>
      <Col>
        <div className={Style.settingSubTitle}>{label}</div>
      </Col>
      <Col>
        <Switch size="large" value={value} onChange={onChange} />
      </Col>
    </Row>
  );

  return (
    <div>
      <div className={Style.settingTitle}>元素开关</div>
      {row('显示 Header', showHeader, toggleShowHeader)}
      {row('显示面包屑', showBreadcrumbs, toggleShowBreadcrumbs)}
      {row('显示 Footer', showFooter, toggleShowFooter)}
    </div>
  );
});
