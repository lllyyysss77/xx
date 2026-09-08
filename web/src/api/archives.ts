/**
 * 历史全流程材料归档接口
 * 后端路由: /admin/archives
 */
import request from './client';

export interface ArchiveItem {
  id: string;
  sourceType: 'proposal' | 'position' | 'announcement' | 'material';
  sourceName: string;
  fileName: string;
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  organizationId: string;
  electionFiefId?: string;
}

export const getArchives = (params?: { fiefId?: string }): Promise<ArchiveItem[]> =>
  request.get('/admin/archives', { params }).then((res: any) => {
    const rawList = Array.isArray(res) ? res : [];
    return rawList.map((r: any) => ({
      id: r.id,
      sourceType: (r.archSourceType || 'other').replace('_file', ''),
      sourceName: r.archDisplayName || r.fileName || '归档材料',
      fileName: r.archDisplayName || r.fileName || '未命名附件',
      // 严格映射后端真实字段（后端返回 snake_case，兼顾前端 camelCase），不再用假值兜底伪造
      storageKey: r.storage_key || r.storageKey || '',
      sizeBytes: r.size_bytes || r.sizeBytes || 0,
      mimeType: r.mime_type || r.mimeType || 'application/octet-stream',
      // 关键修复：禁止用 new Date() 伪造归档时间（会导致每次刷新时间都变）。
      // 后端真实时间字段优先；若无则返回空串由页面如实显示，绝不编造。
      createdAt: r.created_at || r.createdAt || '',
      organizationId: r.org_id || r.organizationId || r.orgId || '',
      electionFiefId: r.el_id || r.electionFiefId || r.elId || '',
    }));
  });
