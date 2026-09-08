/**
 * 业务插件标准接口
 */
export interface BusinessModule {
  key: string;
  name: string;
  path: string;
  icon?: string;
  perm?: string;
  roles?: string[];
  category: 'election' | 'admin';
  order?: number;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  children?: BusinessModule[];
}

export interface PluginContext {
  modules: BusinessModule[];
}
