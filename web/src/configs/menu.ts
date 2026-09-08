/**
 * 侧边栏菜单配置
 * 权威来源：3_案件取证/33_Web重构施工认知与作战台账.md §5
 * 原则：UI 与路由路径保持不变，仅换底层；去掉父菜单与唯一子菜单同路径的假嵌套。
 * 分组：首页 / 选举管理 / 办理中 / 收尾归档 / 后台管理
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
  // 首页
  {
    items: [{ icon: '🏠', title: '首页工作台', path: '/election/home' }],
  },
  // 选举管理（工作流第1步）
  {
    label: '选举管理',
    items: [
      { icon: '📄', title: '提案审批', path: '/election/proposals' },
      { icon: '📋', title: '选举活动管理', path: '/election/activities' },
    ],
  },
  // 办理中（工作流第2步）
  {
    label: '办理中',
    items: [
      { icon: '👥', title: '岗位管理', path: '/election/positions' },
      { icon: '📝', title: '材料提交管理', path: '/election/materials' },
      { icon: '🙋', title: '候选人管理', path: '/election/candidates' },
      {
        icon: '📢',
        title: '公告通知',
        path: '/election/announcements',
        children: [
          { title: '公告记录', path: '/election/announcements' },
          { title: '快捷模板', path: '/election/quick-templates' },
        ],
      },
    ],
  },
  // 收尾归档（工作流第3步）
  {
    label: '收尾归档',
    items: [
      { icon: '🗄️', title: '历史归档', path: '/election/archives' },
    ],
  },
  // 后台管理（仅管理员，唯一保留子菜单的分组）
  {
    label: '后台管理',
    items: [
      {
        icon: '⚙️',
        title: '后台管理',
        path: '/admin',
        children: [
          { title: '人员管理', path: '/admin/users', roles: ['platform_admin', 'sub_admin'] },
          { title: '角色管理', path: '/admin/roles', roles: ['platform_admin'] },
          { title: '通知管理', path: '/admin/notifications', roles: ['platform_admin', 'sub_admin'] },
          { title: '归属地开号', path: '/admin/orgsetup', roles: ['platform_admin'] },
        ],
      },
    ],
  },
];
