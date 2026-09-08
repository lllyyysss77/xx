import React from 'react';
import { Layout, Breadcrumb } from 'tdesign-react';
import { useUiStore } from 'stores/useUiStore';
import Style from './Page.module.less';

const { Content } = Layout;
const { BreadcrumbItem } = Breadcrumb;

/** 业务页统一容器：可选面包屑 + 页面内容。全屏与否由 layouts 层决定。 */
const Page = ({
  children,
  breadcrumbs,
}: React.PropsWithChildren<{ breadcrumbs?: string[] }>) => {
  const showBreadcrumbs = useUiStore((s) => s.showBreadcrumbs);

  return (
    <Content className={Style.panel}>
      {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb className={Style.breadcrumb}>
          {breadcrumbs.map((item, index) => (
            <BreadcrumbItem key={index}>{item}</BreadcrumbItem>
          ))}
        </Breadcrumb>
      )}
      {children}
    </Content>
  );
};

export default React.memo(Page);
