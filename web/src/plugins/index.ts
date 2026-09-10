/**
 * 插件注册中心
 * 所有业务模块在这里注册。根据登录用户的 role 和 permissions 动态生成菜单与路由。
 */
import { lazy } from 'react';
import { BusinessModule } from './types';

const Dashboard = lazy(() => import('../modules/dashboard/Dashboard'));
const Home = lazy(() => import('../modules/home/Home'));
const Proposals = lazy(() => import('../modules/proposals/Proposals'));
const Activities = lazy(() => import('../modules/activities/Activities'));
const ActivityDetail = lazy(() => import('../modules/activities/ActivityDetail'));
const Positions = lazy(() => import('../modules/positions/Positions'));
const Materials = lazy(() => import('../modules/materials/Materials'));
const Candidates = lazy(() => import('../modules/candidates/Candidates'));
const Announcements = lazy(() => import('../modules/announcements/Announcements'));
const Templates = lazy(() => import('../modules/templates/Templates'));
const Archives = lazy(() => import('../modules/archives/Archives'));
const Users = lazy(() => import('../modules/users/Users'));
const Roles = lazy(() => import('../modules/roles/Roles'));
const Notifications = lazy(() => import('../modules/notifications/Notifications'));
const OrgSetup = lazy(() => import('../modules/orgsetup/OrgSetup'));
const ScheduleBoard = lazy(() => import('../modules/schedule/ScheduleBoard'));
const DutyAuditLogs = lazy(() => import('../modules/audit/DutyAuditLogs'));

export const ALL_MODULES: BusinessModule[] = [
  // —— 选举业务 ——
  {
    key: 'dashboard',
    name: '概览工作台',
    path: '/dashboard',
    icon: 'dashboard',
    category: 'election',
    order: 1,
    component: Dashboard,
  },
  {
    key: 'home',
    name: 'D 日工作台',
    path: '/election/home',
    icon: 'home',
    category: 'election',
    order: 2,
    component: Home,
  },
  {
    key: 'proposals',
    name: '选举提案',
    path: '/election/proposals',
    icon: 'file-add',
    perm: 'proposal:create',
    roles: ['platform_admin', 'sub_admin', 'editor', 'reviewer'],
    category: 'election',
    order: 3,
    component: Proposals,
  },
  {
    key: 'activities',
    name: '换届活动',
    path: '/election/activities',
    icon: 'calendar',
    category: 'election',
    order: 4,
    component: Activities,
    children: [
      {
        key: 'activity-detail',
        name: '活动详情',
        path: '/election/activity/:id',
        category: 'election',
        component: ActivityDetail,
      },
    ],
  },
  {
    key: 'schedule',
    name: '倒排工期表',
    path: '/election/schedule',
    icon: 'time',
    category: 'election',
    order: 5,
    component: ScheduleBoard,
  },
  {
    key: 'positions',
    name: '岗位选举表',
    path: '/election/positions',
    icon: 'user-group',
    category: 'election',
    order: 5,
    component: Positions,
  },
  {
    key: 'materials',
    name: '报名材料',
    path: '/election/materials',
    icon: 'folder',
    roles: ['platform_admin', 'sub_admin', 'editor', 'reviewer'],
    category: 'election',
    order: 6,
    component: Materials,
  },
  {
    key: 'candidates',
    name: '候选人管理',
    path: '/election/candidates',
    icon: 'user',
    roles: ['platform_admin', 'sub_admin', 'editor', 'reviewer'],
    category: 'election',
    order: 7,
    component: Candidates,
  },
  {
    key: 'announcements',
    name: '公告发文',
    path: '/election/announcements',
    icon: 'notification',
    roles: ['platform_admin', 'sub_admin', 'editor', 'reviewer'],
    category: 'election',
    order: 8,
    component: Announcements,
  },
  {
    key: 'templates',
    name: '快捷模板',
    path: '/election/quick-templates',
    icon: 'file-copy',
    category: 'election',
    order: 9,
    component: Templates,
  },
  {
    key: 'archives',
    name: '材料归档',
    path: '/election/archives',
    icon: 'archive',
    category: 'election',
    order: 10,
    component: Archives,
  },

  // —— 后台管理 ——
  {
    key: 'users',
    name: '人员管理',
    path: '/admin/users',
    icon: 'user',
    roles: ['platform_admin', 'sub_admin'],
    category: 'admin',
    order: 1,
    component: Users,
  },
  {
    key: 'roles',
    name: '角色权限',
    path: '/admin/roles',
    icon: 'lock-on',
    perm: 'role:manage',
    roles: ['platform_admin'],
    category: 'admin',
    order: 2,
    component: Roles,
  },
  {
    key: 'notifications',
    name: '消息推送',
    path: '/admin/notifications',
    icon: 'chat',
    roles: ['platform_admin', 'sub_admin'],
    category: 'admin',
    order: 3,
    component: Notifications,
  },
  {
    key: 'orgsetup',
    name: '归属地开号',
    path: '/admin/orgsetup',
    icon: 'lock-on',
    roles: ['platform_admin'],
    category: 'admin',
    order: 4,
    component: OrgSetup,
  },
  {
    key: 'duty-audit',
    name: '经办履职留痕',
    path: '/admin/duty-audit',
    icon: 'time',
    roles: ['platform_admin', 'sub_admin'],
    category: 'admin',
    order: 5,
    component: DutyAuditLogs,
  },
];

export function getMenuModules(role?: string, permissions: string[] = []): BusinessModule[] {
  if (role === 'platform_admin') {
    return ALL_MODULES.filter((m) => !m.path.includes(':'));
  }
  return ALL_MODULES.filter((m) => {
    if (m.path.includes(':')) return false;
    let ok = true;
    if (m.roles && m.roles.length > 0) {
      ok = ok && !!role && m.roles.includes(role);
    }
    if (m.perm) {
      ok = ok && (permissions.includes(m.perm) || permissions.includes('*'));
    }
    return ok;
  });
}

export function getAllRoutes(): BusinessModule[] {
  const routes: BusinessModule[] = [];
  for (const m of ALL_MODULES) {
    routes.push(m);
    if (m.children) routes.push(...m.children);
  }
  return routes;
}
