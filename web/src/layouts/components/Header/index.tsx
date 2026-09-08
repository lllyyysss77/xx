import React, { memo } from 'react';
import { Layout, Button, Space } from 'tdesign-react';
import { ViewListIcon } from 'tdesign-icons-react';
import { useUiStore } from 'stores/useUiStore';
import HeaderIcon from './HeaderIcon';
import { HeaderMenu } from '../Menu';
import Search from './Search';
import Style from './index.module.less';

const { Header } = Layout;

export default memo((props: { showMenu?: boolean }) => {
  const showHeader = useUiStore((s) => s.showHeader);
  const toggleMenu = useUiStore((s) => s.toggleMenu);

  if (!showHeader) {
    return null;
  }

  const HeaderLeft = props.showMenu ? (
    <div>
      <HeaderMenu />
    </div>
  ) : (
    <Space align="center">
      <Button
        shape="square"
        size="large"
        variant="text"
        onClick={() => toggleMenu(null)}
        icon={<ViewListIcon />}
      />
      <Search />
    </Space>
  );

  return (
    <Header className={Style.panel}>
      <div className={Style.headerLeft}>
        {HeaderLeft}
        <div className={Style.brandBlock}>
          <div className={Style.brandTitle}>城厢区村居换届选举系统</div>
          <div className={Style.brandSub}>统一后台工作台</div>
        </div>
      </div>
      <HeaderIcon />
    </Header>
  );
});
