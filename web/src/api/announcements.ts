/**
 * 公告与模板接口
 * 后端路由: /admin/announcements & /admin/announcement-templates
 */
import request from './client';
import { MaterialFile } from './files';

export interface AnnouncementTemplate {
  id: string;
  atCode: string;
  atName: string;
  atVersion: string;
  atContent: string;
  atNeedRemind: boolean;
  atNote?: string;
  active: boolean;
}

export interface Announcement {
  id: string;
  electionFiefId: string;
  fiefName: string;
  templateId?: string;
  templateName?: string;
  templateCode?: string;
  stageKey?: string;
  title: string;
  body: string;
  status: 'draft' | 'published';
  annSign?: string;
  annSignDate?: string;
  annOpenMaterialSubmit: boolean;
  annPublishMode: 'immediate' | 'scheduled';
  annPublishAt?: string;
  annRemindHours: number;
  annRemindTo: string;
  createdBy: string;
  updatedBy: string;
  publishedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  files: MaterialFile[];
}

// 模板列表
export const getAnnouncementTemplates = (params?: {
  orgType?: 'village' | 'community';
  active?: boolean;
}): Promise<AnnouncementTemplate[]> =>
  request.get('/admin/announcement-templates', { params });

// 公告列表
export const getAnnouncements = (params?: {
  electionFiefId?: string;
  status?: string;
}): Promise<Announcement[]> =>
  request.get('/admin/announcements', { params }).then((res: any) => {
    if (!Array.isArray(res)) return [];
    return res.map((r: any) => ({
      id: r.id,
      electionFiefId: r.electionFiefId,
      fiefName: r.fiefName || '',
      templateId: r.templateId,
      templateName: r.templateName || '',
      templateCode: r.templateCode || '',
      stageKey: r.stageKey || '',
      title: r.title || '',
      body: r.body || '',
      status: r.status || 'draft',
      annSign: r.annSign,
      annSignDate: r.annSignDate,
      annOpenMaterialSubmit: r.annOpenMaterialSubmit ?? false,
      annPublishMode: r.annPublishMode || 'immediate',
      annPublishAt: r.annPublishAt,
      annRemindHours: r.annRemindHours ?? 0,
      annRemindTo: r.annRemindTo || '',
      createdBy: r.createdBy,
      updatedBy: r.updatedBy,
      publishedBy: r.publishedBy,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      files: r.files || [],
    }));
  });

// 详情
export const getAnnouncement = (id: string): Promise<Announcement> =>
  request.get(`/admin/announcements/${id}`);

// 保存公告 (新建/编辑)
export const saveAnnouncement = (
  id: string | null,
  payload: Partial<Announcement>,
): Promise<Announcement> =>
  id ? request.patch(`/admin/announcements/${id}`, payload) : request.post('/admin/announcements', payload);

// 发布公告
export const publishAnnouncement = (id: string): Promise<void> =>
  request.post(`/admin/announcements/${id}/publish`);

// 上传公告附件
export const uploadAnnouncementFile = (id: string, file: File): Promise<MaterialFile> => {
  const fd = new FormData();
  fd.append('file', file);
  // 不手动设 Content-Type：浏览器需自动携带 multipart boundary（client 拦截器已处理）
  return request.post(`/admin/announcements/${id}/file`, fd);
};

// 删除公告附件
export const deleteAnnouncementFile = (id: string, fileId: string): Promise<void> =>
  request.delete(`/admin/announcements/${id}/file/${fileId}`);

// 获取指定公告的附件列表
export const getAnnouncementFiles = (id: string): Promise<MaterialFile[]> =>
  request.get(`/admin/announcements/${id}/files`);

