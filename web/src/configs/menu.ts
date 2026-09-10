/**
 * 侧边栏菜单配置（命名与 plugins/index.ts 路由注册名保持一致：同一页面两个入口名称必须相同）
 * 分组：工作台 / 选举业务 / 后台管理
 * icon 为 tdesign-icons-react 图标名，由 layouts/components/Menu.tsx 统一映射渲染
 */
export interface IMenuChild {
  title: string;
  path: string;
  note?: string;
  /** 允许访问的角色，不填则所有登录用户可见 */
  roles?: string[];
}

export interface IMenuItem {
  icon: string;
  title: string;
  path: string;
  children?: IMenuChild[];
}

export interface IMenuGroup {
  label?: string;
  items: IMenuItem[];
}

export const MENU_CONFIG: IMenuGroup[] = [
  // 工作台
  {
    items: [{ icon: 'home', title: '工作台', path: '/election/home' }],
  },
  // 选举业务
  {
    label: '选举业务',
    items: [
      { icon: 'file-add', title: '选举提案', path: '/election/proposals' },
      { icon: 'calendar', title: '换届活动', path: '/election/activities' },
      { icon: 'time', title: '倒排工期表', path: '/election/schedule' },
      { icon: 'user-group', title: '岗位管理', path: '/election/positions' },
      { icon: 'folder', title: '报名材料', path: '/election/materials' },
      { icon: 'user', title: '候选人管理', path: '/election/candidates' },
      { icon: 'notification', title: '公告发文', path: '/election/announcements' },
      { icon: 'file-copy', title: '快捷模板', path: '/election/quick-templates' },
      { icon: 'archive', title: '材料归档', path: '/election/archives' },
    ],
  },
  // 后台管理
  {
    label: '后台管理',
    items: [
      {
        icon: 'setting',
        title: '系统管理',
        path: '/admin',
        children: [
          { title: '人员管理', path: '/admin/users', roles: ['platform_admin', 'sub_admin'] },
          { title: '角色权限', path: '/admin/roles', roles: ['platform_admin'] },
          { title: '消息推送', path: '/admin/notifications', roles: ['platform_admin', 'sub_admin'] },
          { title: '归属地开号', path: '/admin/orgsetup', roles: ['platform_admin'] },
          { title: '经办履职留痕', path: '/admin/duty-audit', roles: ['platform_admin', 'sub_admin'] },
        ],
      },
    ],
  },
];
