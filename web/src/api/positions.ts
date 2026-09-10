/**
 * 岗位接口
 * 后端路由: /admin/positions
 */
import request from './client';

export interface Position {
  id: string;
  electionFiefId: string;
  fiefName: string;
  name: string;
  quota: number;
  electionMethod?: string;
  requirement?: string;
  applicationStart: string;
  applicationEnd: string;
  materialReviewStart: string;
  materialReviewEnd: string;
  status: string;
  files?: PositionFile[];
}

export interface PositionFile {
  id: string;
  positionId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdBy: string;
  createdAt: string;
}

// 列表
export const getPositions = (params?: { electionFiefId?: string }): Promise<Position[]> =>
  request.get('/admin/positions', { params }).then((res: any) => {
    if (!Array.isArray(res)) return [];
    return res.map((r: any) => ({
      id: r.id,
      electionFiefId: r.electionFiefId,
      fiefName: r.fiefName || '',
      name: r.name || '',
      quota: r.quota ?? 0,
      electionMethod: r.electionMethod || '直接选举',
      requirement: r.requirement || '',
      applicationStart: r.applicationStart || '',
      applicationEnd: r.applicationEnd || '',
      materialReviewStart: r.materialReviewStart || '',
      materialReviewEnd: r.materialReviewEnd || '',
      status: r.status || 'open',
      files: r.files,
    }));
  });

// 上传岗位附件
export const uploadPositionFile = (positionId: string, file: File): Promise<PositionFile> => {
  const fd = new FormData();
  fd.append('file', file);
  return request.post(`/admin/positions/${positionId}/file`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 删除岗位附件
export const deletePositionFile = (positionId: string, fileId: string): Promise<void> =>
  request.delete(`/admin/positions/${positionId}/file/${fileId}`);
