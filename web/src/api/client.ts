/**
 * 统一 API 请求客户端
 * —— 自动完成 snake_case 到 camelCase 转换
 * —— 自动注入 Token
 * —— 统一错误拦截
 */
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// 同源优先：生产环境由后端 Fastify 同源托管 web/dist，请求走相对路径（无跨域、无端口硬编码）。
// 本地 vite dev 时通过 vite.config.js 的 server.proxy 把 '/admin'、'/files'、'/auth' 等代理到后端。
// 仅当显式配置 VITE_API_BASE_URL 时才跨域直连（预留）。
export const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '';

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
