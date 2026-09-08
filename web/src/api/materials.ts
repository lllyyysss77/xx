/**
 * 报名材料接口
 * 后端路由: /admin/materials
 */
import request from './client';
import { MaterialFile, uploadFile } from './files';

export interface Material {
  id: string;
  electionFiefId: string;
  fiefName: string;
  fiefDDay?: string;
  candidateUserId: string;
  candidateName?: string;
  candidatePhone?: string;
  submitterName?: string;
  submitterPhone?: string;
  candidateId?: string;
  title: string;
  description?: string;
  status: 'submitted' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  files: MaterialFile[];
}

// 列表
export const getMaterials = (params?: {
  status?: string;
  electionFiefId?: string;
  keyword?: string;
}): Promise<Material[]> =>
  request.get('/admin/materials', { params }).then((res: any) => {
    if (!Array.isArray(res)) return [];
    return res.map((r: any) => ({
      id: r.id,
      electionFiefId: r.electionFiefId,
      fiefName: r.fiefName || '',
      fiefDDay: r.fiefDDay,
      candidateUserId: r.candidateUserId,
      candidateName: r.candidateName || r.submitterName || '',
      candidatePhone: r.candidatePhone || r.submitterPhone || '',
      submitterName: r.submitterName || '',
      submitterPhone: r.submitterPhone || '',
      candidateId: r.candidateId,
      title: r.title || '',
      description: r.description,
      status: r.status,
      submittedAt: r.submittedAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      reviewedByName: r.reviewedByName || '',
      reviewNote: r.reviewNote,
      files: r.files || [],
    }));
  });

// 详情
export const getMaterial = (id: string): Promise<Material> => request.get(`/admin/materials/${id}`);

// 组织推荐 (内推) 录入：页面用 candidatePhone/candidateName，后端契约为 phone/name，在此映射
export const createMaterial = (payload: {
  electionFiefId: string;
  candidatePhone: string;
  candidateName: string;
  title: string;
  description?: string;
}): Promise<Material> =>
  request.post('/admin/materials', {
    electionFiefId: payload.electionFiefId,
    phone: payload.candidatePhone,
    name: payload.candidateName,
    title: payload.title,
    description: payload.description,
  });

// 上传材料附件（后端两步走：先 /files/upload 拿 storageKey，再关联入 material_files）
export const uploadMaterialFile = async (materialId: string, file: File): Promise<MaterialFile> => {
  const uploaded = await uploadFile(file);
  return request.post(`/admin/materials/${materialId}/file`, {
    storageKey: uploaded.storageKey,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });
};

// 审核（后端 PATCH，字段 note；通过后自动入候选人池）
export const reviewMaterial = (
  id: string,
  status: 'approved' | 'rejected',
  reviewNote?: string,
): Promise<void> => request.patch(`/admin/materials/${id}/review`, { status, note: reviewNote });
