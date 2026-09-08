/**
 * 选举封地活动与日程接口
 * 后端路由: /admin/election-fiefs
 */
import request from './client';

export interface ElectionFief {
  id: string;
  name: string;
  electionTermId: string;
  termName: string;
  organizationId: string;
  organizationName: string;
  unitId: string;
  unitName: string;
  dDay: string;
  status: 'draft' | 'active' | 'closed';
  version: number;
  createdBy: string;
  createdAt: string;
}

export interface FiefStage {
  id: string;
  electionFiefId: string;
  stageTemplateId: string;
  stageKey: string;
  stageName: string;
  startDate: string;
  endDate: string;
  stageOrder: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

// 活动列表
export const getElectionFiefs = (params?: { termId?: string; status?: string }): Promise<ElectionFief[]> =>
  request.get('/admin/election-fiefs', { params });

// 活动详情
export const getElectionFief = (id: string): Promise<ElectionFief> => request.get(`/admin/election-fiefs/${id}`);

// 14 阶段日程
export const getFiefStages = (fiefId: string): Promise<FiefStage[]> =>
  request.get(`/admin/election-fiefs/${fiefId}/stages`);
