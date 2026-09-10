/**
 * 统一 API 请求客户端
 * —— 自动完成 snake_case 到 camelCase 转换
 * —— 自动注入 Token
 * —— 统一错误拦截
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ============================================================
// [TAG-INDEX] client.ts — 统一 API 请求客户端（axios 封装）
// [ENV-CONFIG]  L9-22   getFallbackBaseUrl — baseURL 派生（VITE_API_BASE_URL 可配，3003 端口走相对路径代理）
// [REUSABLE]    L30-42  toCamelCase — snake_case→camelCase 递归转换
// [ROUTE-CORE]  L44-48  axios 实例（baseURL/timeout/withCredentials）
// [AUTH]        L51-63  请求拦截器（token 注入 + FormData Content-Type 处理）
// [BREAKPOINT]   L66-86  响应拦截器（snake→camel + 401 清除 token 跳转登录）
// ============================================================
// [ENV-CONFIG] baseURL 派生 — VITE_API_BASE_URL 优先；3003 端口走相对路径（Vite 代理）；生产同源
const getFallbackBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:3100';
  const { hostname, port } = window.location;
  // 如果前端跑在 3003 端口，说明是本地 Vite 开发服务器，且 vite.config.js 已配置反向代理（/auth, /admin, /files 等）
  // 直接走相对路径即可自动转发到后端 3100，同时免疫 IP 跨域、端口未监听 0.0.0.0 或局域网拦截
  if (port === '3003') {
    return '';
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3100';
  }
  // 生产构建或静态托管环境：默认同源
  return window.location.origin || 'http://127.0.0.1:3100';
};

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || getFallbackBaseUrl();

/**
 * 递归将对象的 snake_case 键转为 camelCase
 */
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v));
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File) && !(obj instanceof Blob)) {
    return Object.keys(obj).reduce((result: any, key: string) => {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: false,
});

// [AUTH] 请求拦截器 — 自动注入 Bearer token（cxq_token）；FormData 时删除 Content-Type 让浏览器自动带 multipart boundary
// —— 请求拦截：自动注入 Token ——
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('cxq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // ⚠️ 极其重要：如果是 FormData 上传文件，绝对不可强加 Content-Type: application/json，必须让浏览器自动携带 multipart boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// [BREAKPOINT] 响应拦截器 — snake→camel 深度转换 + 401 清除 token 跳转登录（全局认证失效断点）
// —— 响应拦截：统一转换 snake_case 并处理错误 ——
request.interceptors.response.use(
  (resp) => {
    // 自动将后端返回的 snake_case 字段深度转换为 camelCase
    return toCamelCase(resp.data);
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cxq_token');
      localStorage.removeItem('cxq_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const msg =
      (error.response?.data as { message?: string })?.message ||
      (error.response?.data as { error?: string })?.error ||
      error.message ||
      '网络错误';
    return Promise.reject(new Error(msg));
  },
);

export default request;
