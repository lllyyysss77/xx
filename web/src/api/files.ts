/**
 * 文件上传下载通用接口
 * 后端路由: /files/*
 */
import request, { API_BASE_URL } from './client';

export interface MaterialFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdBy?: string;
  createdAt?: string;
}

/**
 * 生成文件下载 URL（后端 /files/:key 为公开路由，无需 token）
 */
export const getFileUrl = (storageKey: string): string => {
  return `${API_BASE_URL}/files/${encodeURIComponent(storageKey)}`;
};

/**
 * 通用文件上传
 */
export const uploadFile = (file: File): Promise<MaterialFile> => {
  const fd = new FormData();
  fd.append('file', file);
  return request.post('/files/upload', fd);
};

/**
 * 格式化字节数为人类可读
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
