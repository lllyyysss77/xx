/**
 * 多附件展示组件
 * —— 解决旧前端附件不按原文件名下载、多附件展示混乱的问题
 *
 * 功能:
 *   - 显示文件名 + 大小
 *   - 图片类型支持新窗口预览；PDF 支持浏览器原生预览；Word/Excel 走下载
 *   - 强制 blob 下载，文件名用真实文件名
 *   - 非法 storageKey 防御：不满足 32 位 hex 规则时不渲染预览/下载入口，显示「文件缺失」
 */
import React from 'react';
import { Space, Tag } from 'tdesign-react';
import { BrowseIcon, DownloadIcon, FileIcon } from 'tdesign-icons-react';
import { getFileUrl, formatFileSize } from '../../api/files';

export interface FileItem {
  id: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey: string;
  createdAt?: string;
}

interface FileListProps {
  files: FileItem[];
}

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const PDF_MIMES = ['application/pdf'];

/** 后端 /files/:key 仅接受 32 位小写 hex（可带 .ext），非法 key 请求必 400 */
const VALID_KEY_RE = /^[a-f0-9]{32}(\.[a-zA-Z0-9]{1,10})?$/;

const isInvalidKey = (storageKey: string): boolean => !storageKey || !VALID_KEY_RE.test(storageKey);

export const FileList: React.FC<FileListProps> = ({ files }) => {
  if (!files?.length) return <span style={{ color: '#999' }}>无附件</span>;

  const handleDownload = (file: FileItem) => {
    if (isInvalidKey(file.storageKey)) return;
    const url = getFileUrl(file.storageKey);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName || '下载附件';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreview = (file: FileItem) => {
    if (isInvalidKey(file.storageKey)) return;
    window.open(getFileUrl(file.storageKey), '_blank');
  };

  return (
    <div className="file-list">
      {files.map((f) => {
        const isImage = f.mimeType && IMAGE_MIMES.includes(f.mimeType);
        const isPdf = f.mimeType && PDF_MIMES.includes(f.mimeType);
        const invalid = isInvalidKey(f.storageKey);
        return (
          <div
            key={f.id}
            className="file-list__item"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid #eee',
              gap: 12,
            }}
          >
            <Space size="small" style={{ flex: 1, minWidth: 0 }}>
              <FileIcon size="18px" />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
                title={f.fileName}
              >
                {f.fileName}
              </span>
              {typeof f.sizeBytes === 'number' && (
                <span style={{ color: '#999', fontSize: 12 }}>
                  {formatFileSize(f.sizeBytes)}
                </span>
              )}
            </Space>
            <Space size="small">
              {invalid ? (
                <Tag size="small" theme="default" variant="light">
                  文件缺失
                </Tag>
              ) : (
                <>
                  {(isImage || isPdf) && (
                    <span
                      style={{ cursor: 'pointer', color: '#0052d9', fontSize: 13 }}
                      onClick={() => handlePreview(f)}
                    >
                      <BrowseIcon size="16px" /> 预览
                    </span>
                  )}
                  <DownloadIcon
                    size="16px"
                    style={{ cursor: 'pointer', color: '#0052d9' }}
                    onClick={() => handleDownload(f)}
                  />
                </>
              )}
            </Space>
          </div>
        );
      })}
    </div>
  );
};
