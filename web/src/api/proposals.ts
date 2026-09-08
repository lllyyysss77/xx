/**
 * 选举提案接口
 * 后端路由: /admin/proposals
 */
import request from './client';

export interface PositionInput {
  name: string;
  quota: number;
  requirement?: string;
  electionMethod?: string;
  sampleFileName?: string;
  sampleStorageKey?: string;
  sampleSizeBytes?: number;
  sampleMimeType?: string;
}

export interface Proposal {
  id: string;
  organizationId: string;
  organizationName: string;
  termId: string;
  unitId: string;
  name: string;
  dDay: string; // YYYY-MM-DD
  orgType: 'village' | 'community';
  positions: PositionInput[];
  status: 'pending' | 'approved' | 'rejected';
  proposedBy: string;
  proposedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectReason?: string;
  createdAt: string;
  files?: ProposalFile[];
}

export interface ProposalFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdBy: string;
  createdAt: string;
}

// 列表
export const getProposals = (params?: { status?: string; keyword?: string }): Promise<Proposal[]> =>
  request.get('/admin/proposals', { params });

// 详情
export const getProposal = (id: string): Promise<Proposal> => request.get(`/admin/proposals/${id}`);

// 创建
export const createProposal = (payload: Partial<Proposal>): Promise<Proposal> =>
  request.post('/admin/proposals', payload);

// 编辑
export const updateProposal = (id: string, payload: Partial<Proposal>): Promise<Proposal> =>
  request.patch(`/admin/proposals/${id}`, payload);

// 审核
export const reviewProposal = (id: string, decision: 'approved' | 'rejected', note?: string): Promise<void> =>
  request.post(`/admin/proposals/${id}/review`, { decision, note });

// 上传附件
export const uploadProposalFile = (id: string, file: File): Promise<ProposalFile> => {
  const fd = new FormData();
  fd.append('file', file);
  return request.post(`/admin/proposals/${id}/file`, fd);
};

// 删除附件
export const deleteProposalFile = (id: string, fileId: string): Promise<void> =>
  request.delete(`/admin/proposals/${id}/file/${fileId}`);
