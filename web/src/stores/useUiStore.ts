/**
 * 界面偏好 Store（Zustand）
 * 顶替 TDesign Starter 的 redux global slice：只保留政务后台实际用到的 UI 状态。
 * 固定浅色主题 + 侧边栏布局，不保留 starter 的换肤 / 多布局切换（政务内部系统不需要）。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { version } from '../../package.json';

/** 布局枚举仅保留侧边栏一种，保留枚举是为了外壳层引用最小改动 */
export enum ELayout {
  side = 1,
}

interface UiState {
  /** 侧边栏是否折叠 */
  collapsed: boolean;
  /** 右侧设置抽屉 */
  setting: boolean;
  showHeader: boolean;
  showBreadcrumbs: boolean;
  showFooter: boolean;
  version: string;
  toggleMenu: (force?: boolean | null) => void;
  toggleSetting: () => void;
  toggleShowHeader: () => void;
  toggleShowBreadcrumbs: () => void;
  toggleShowFooter: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      collapsed: typeof window !== 'undefined' && window.innerWidth < 1000,
      setting: false,
      showHeader: true,
      showBreadcrumbs: true,
      showFooter: true,
      version,
      toggleMenu: (force) =>
        set((s) => ({ collapsed: force === null || force === undefined ? !s.collapsed : !!force })),
      toggleSetting: () => set((s) => ({ setting: !s.setting })),
      toggleShowHeader: () => set((s) => ({ showHeader: !s.showHeader })),
      toggleShowBreadcrumbs: () => set((s) => ({ showBreadcrumbs: !s.showBreadcrumbs })),
      toggleShowFooter: () => set((s) => ({ showFooter: !s.showFooter })),
    }),
    {
      name: 'cxq-ui',
      partialize: (s) => ({
        collapsed: s.collapsed,
        showHeader: s.showHeader,
        showBreadcrumbs: s.showBreadcrumbs,
        showFooter: s.showFooter,
      }),
    },
  ),
);
