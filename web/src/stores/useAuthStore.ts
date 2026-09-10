/**
 * 认证状态 Store (Zustand)
 * 顶替旧 redux user module + localStorage 假角色切换。
 * 登录走 /auth/admin/login（扁平返回），再拉该角色真实权限点。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LoginUser, LoginResult, login as apiLogin, logout as apiLogout } from '../api/auth';

interface AuthState {
  token: string | null;
  user: LoginUser | null;
  permissions: string[];
  login: (phone: string, password: string, organizationId: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPerm: (perm: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  clear: () => void;
}

// ============================================================
// [TAG-INDEX] useAuthStore.ts — 认证状态管理（zustand）
// [AUTH]  L21    useAuthStore — 全局认证状态（token/user/org/permissions）
// [AUTH]  L48-49 login 成功后持久化（cxq_token + cxq_user 到 localStorage）
// [AUTH]  L75-76 logout 清除持久化（token + user）
// [BREAKPOINT] 登录成功后合并后端返回的 permissions 到 user 对象（前端权限闸 PermGate 的数据源）
// ============================================================
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissions: [],

      login: async (phone, password, organizationId) => {
        const resp: LoginResult = await apiLogin({ phone, password, organizationId });

        // 权限点由后端登录时直接带回（role_permissions）
        const realPerms: string[] = resp.permissions || [];

        const mergedUser: LoginUser = {
          phone,
          displayName: resp.displayName || phone,
          name: resp.displayName || phone,
          orgId: resp.organizationId,
          organizationId: resp.organizationId,
          organizationName: resp.orgName || '',
          orgName: resp.orgName || '',
          orgType: resp.orgType || 'village',
          role: resp.role || 'sub_admin',
          permissions: realPerms,
        };

        set({ token: resp.token, user: mergedUser, permissions: realPerms });
        // [AUTH] 登录成功持久化 — token + user 写入 localStorage（client.ts 请求拦截器从此处取 token）
        localStorage.setItem('cxq_token', resp.token);
        localStorage.setItem('cxq_user', JSON.stringify(mergedUser));
      },

      logout: async () => {
        try {
          await apiLogout();
        } catch {
          // 后端登出失败不阻塞本地清理
        }
        get().clear();
      },

      hasPerm: (perm: string) => {
        const user = get().user;
        if (user?.role === 'platform_admin') return true;
        const perms = get().permissions;
        return perms.includes(perm) || perms.includes('*');
      },

      hasRole: (...roles: string[]) => {
        const role = get().user?.role;
        return !!role && roles.includes(role);
      },

      clear: () => {
        set({ token: null, user: null, permissions: [] });
        // [AUTH] 登出清除 — token + user 从 localStorage 删除（与 client.ts 401 处理保持一致）
        localStorage.removeItem('cxq_token');
        localStorage.removeItem('cxq_user');
      },
    }),
    {
      name: 'cxq-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        permissions: state.permissions,
      }),
    },
  ),
);
