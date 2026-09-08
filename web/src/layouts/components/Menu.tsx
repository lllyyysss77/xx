import React, { memo, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'tdesign-react';
import { MENU_CONFIG } from 'configs/menu';
import { useUiStore } from 'stores/useUiStore';
import { useAuthStore } from 'stores/useAuthStore';
import MenuLogo from './MenuLogo';
import Style from './Menu.module.less';

const { SubMenu, MenuItem, HeadMenu } = Menu;

/** 按当前用户角色过滤菜单：子项声明了 roles 且当前角色不在其中则隐藏 */
const filterByRole = <T extends { roles?: string[] }>(items: T[], role?: string): T[] =>
  items.filter((it) => !it.roles || !role || it.roles.includes(role));

interface IMenuProps {
  showLogo?: boolean;
  showOperation?: boolean;
}

/** 顶部菜单（固定浅色，侧栏布局下不使用，保留以兼容引用） */
export const HeaderMenu = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const topItems = MENU_CONFIG.flatMap((g) => g.items);

  return (
    <HeadMenu
      expandType="popup"
      style={{ marginBottom: 20 }}
      theme="light"
      value={location.pathname}
      onChange={(v) => navigate(String(v))}
    >
      {topItems.map((item) => (
        <MenuItem
          key={item.path}
          value={item.path}
          icon={<span className={Style.menuIcon}>{item.icon}</span>}
          onClick={() => navigate(item.path)}
        >
          {item.title}
        </MenuItem>
      ))}
    </HeadMenu>
  );
});

/**
 * 左侧菜单：结构照「村长仪表盘」靶子 —— 分组标签 + 一级(emoji) + 子菜单。
 * 导航结构唯一来源 configs/menu.ts（外观不改）；角色来自 useAuthStore。
 */
export default memo((props: IMenuProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const collapsed = useUiStore((s) => s.collapsed);
  const version = useUiStore((s) => s.version);
  const role = useAuthStore((s) => s.user?.role);
  const bottomText = collapsed ? version : `城厢区换届选举系统 v${version}`;

  const activePath = location.pathname;

  // 提取所有具备二级子菜单的父级 key（默认全部展开，防止子菜单缩起看不见）
  const allSubMenuKeys = useMemo(() => {
    const keys: string[] = [];
    MENU_CONFIG.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          keys.push(`sub_${item.path}`);
        }
      });
    });
    return keys;
  }, []);

  const [expanded, setExpanded] = useState<string[]>(allSubMenuKeys);

  // 保证所有二级子菜单始终常驻展开，即使点击父标题也不折叠
  const handleExpand = (vals: any) => {
    setExpanded(allSubMenuKeys);
  };

  const renderItem = (item: (typeof MENU_CONFIG)[number]['items'][number]) => {
    const children = item.children ? filterByRole(item.children, role) : [];
    if (!item.children || children.length === 0) {
      return (
        <MenuItem
          key={item.path}
          value={item.path}
          icon={<span className={Style.menuIcon}>{item.icon}</span>}
          onClick={() => navigate(item.path)}
        >
          {item.title}
        </MenuItem>
      );
    }
    return (
      <SubMenu
        key={`sub_${item.path}`}
        value={`sub_${item.path}`}
        title={item.title}
        icon={<span className={Style.menuIcon}>{item.icon}</span>}
      >
        {children.map((child) => (
          <MenuItem key={child.path} value={child.path} onClick={() => navigate(child.path)}>
            {child.title}
          </MenuItem>
        ))}
      </SubMenu>
    );
  };

  return (
    <Menu
      width="232px"
      style={{ flexShrink: 0, height: '100%' }}
      className={Style.menuPanel2}
      value={activePath}
      expanded={allSubMenuKeys}
      onExpand={handleExpand}
      onChange={(v) => navigate(String(v))}
      theme="light"
      collapsed={collapsed}
      operations={props.showOperation ? <div className={Style.menuTip}>{bottomText}</div> : undefined}
      logo={props.showLogo ? <MenuLogo collapsed={collapsed} /> : undefined}
    >
      {MENU_CONFIG.map((group, gi) => {
        // 整组过滤：一级项若带子菜单，子项被角色过滤光后，其父项与分组标签一并隐藏
        const visibleItems = group.items.filter(
          (it) => !it.children || filterByRole(it.children, role).length > 0,
        );
        if (visibleItems.length === 0) return null;
        return (
          <React.Fragment key={gi}>
            {group.label ? <div className={Style.groupLabel}>{group.label}</div> : null}
            {visibleItems.map(renderItem)}
          </React.Fragment>
        );
      })}
    </Menu>
  );
});
