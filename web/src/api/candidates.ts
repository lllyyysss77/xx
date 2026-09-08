/**
 * 候选人接口
 * 后端路由: /admin/candidates
 */
import request from './client';
import { Material } from './materials';

export interface Candidate {
  id: string;
  electionFiefId: string;
  fiefName: string;
  userId: string;
  candidateName: string;
  candidatePhone: string;
  materialId: string;
  materialTitle: string;
  status: 'reviewing' | 'approved' | 'rejected';
  currentRound: 'R1' | 'R2' | 'R3' | 'R4' | 'complete';
  createdAt: string;
  reviews: CandidateReview[];
  material?: Material;
}

export interface CandidateReview {
  id: string;
  candidateId: string;
  round: 'R1' | 'R2' | 'R3' | 'R4';
  reviewerId: string;
  reviewerName: string;
  decision: 'approved' | 'rejected';
  note?: string;
  createdAt: string;
}

export const getCandidates = (params?: {
  electionFiefId?: string;
  status?: string;
  currentRound?: string;
  keyword?: string;
}): Promise<Candidate[]> =>
  request.get('/admin/candidates', { params }).then((res: any) => {
    if (!Array.isArray(res)) return [];
    return res.map((r: any) => ({
      id: r.id,
      electionFiefId: r.electionFiefId,
      fiefName: r.fiefName || '',
      userId: r.userId,
      candidateName: r.candidateName || r.displayName || '',
      candidatePhone: r.candidatePhone || r.phone || '',
      materialId: r.materialId,
      materialTitle: r.materialTitle || '',
      status: r.status,
      currentRound: r.currentRound,
      createdAt: r.createdAt,
      reviews: (r.reviews || []).map((rv: any) => ({
        id: rv.id,
        candidateId: rv.candidateId,
        round: rv.round,
        reviewerId: rv.reviewerId,
        reviewerName: rv.reviewerName || '',
        decision: rv.decision,
        note: rv.note,
        createdAt: rv.createdAt,
      })),
      material: r.material,
    }));
  });

// 详情
export const getCandidate = (id: string): Promise<Candidate> => request.get(`/admin/candidates/${id}`);

// 录入一轮联审结果
export const addCandidateReview = (
  candidateId: string,
  payload: { round: 'R1' | 'R2' | 'R3' | 'R4'; decision: 'approved' | 'rejected'; note?: string },
): Promise<CandidateReview> => request.post(`/admin/candidates/${candidateId}/reviews`, payload);
