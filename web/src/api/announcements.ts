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

// 公告列表（全量返回，不分页：业务侧公告总数≤21，翻页无意义）
export const getAnnouncements = (params?: {
  electionFiefId?: string;
  status?: string;
}): Promise<Announcement[]> =>
  request.get('/admin/announcements', { params: { ...params, limit: 200 } }).then((res: any) => {
    const rows = Array.isArray(res) ? res : (res?.items ?? []);
    return rows.map((r: any) => ({
      id: r.id,
      electionFiefId: r.electionFiefId || r.election_fief_id,
      fiefName: r.fiefName || r.fief_name || '',
      templateId: r.templateId || r.template_id,
      templateName: r.templateName || r.template_name || '',
      templateCode: r.templateCode || r.template_code || '',
      stageKey: r.stageKey || r.stage_key || '',
      title: r.title || '',
      body: r.body || '',
      status: r.status || 'draft',
      annSign: r.annSign || r.ann_sign,
      annSignDate: r.annSignDate || r.ann_sign_date,
      annOpenMaterialSubmit: r.annOpenMaterialSubmit ?? r.ann_open_material_submit ?? false,
      annPublishMode: r.annPublishMode || r.ann_publish_mode || 'immediate',
      annPublishAt: r.annPublishAt || r.ann_publish_at,
      annRemindHours: r.annRemindHours ?? r.ann_remind_hours ?? 0,
      annRemindTo: r.annRemindTo || r.ann_remind_to || '',
      createdBy: r.createdBy || r.created_by,
      updatedBy: r.updatedBy || r.updated_by,
      publishedBy: r.publishedBy || r.published_by,
      publishedAt: r.publishedAt || r.published_at,
      createdAt: r.createdAt || r.created_at,
      updatedAt: r.updatedAt || r.updated_at,
      files: r.files || [],
    }));
  });

// 详情
export const getAnnouncement = (id: string): Promise<Announcement> =>
  request.get(`/admin/announcements/${id}`);

// 保存公告：页面模型使用 ann* 字段，后端白名单使用业务短名；在唯一 API 出口转换，避免组件重复适配。
type AnnouncementWritePayload = {
  title?: string;
  body?: string;
  sign?: string;
  signDate?: string;
  openMaterialSubmit?: boolean;
  publishMode?: 'immediate' | 'scheduled';
  publishAt?: string | null;
  remindHours?: number;
  remindTo?: string;
};

const toAnnouncementWritePayload = (payload: Partial<Announcement>): AnnouncementWritePayload => ({
  title: payload.title,
  body: payload.body,
  sign: payload.annSign,
  signDate: payload.annSignDate,
  openMaterialSubmit: payload.annOpenMaterialSubmit,
  publishMode: payload.annPublishMode,
  publishAt: payload.annPublishAt === undefined ? undefined : payload.annPublishAt || null,
  remindHours: payload.annRemindHours,
  remindTo: payload.annRemindTo,
});

export const saveAnnouncement = (
  id: string | null,
  payload: Partial<Announcement>,
): Promise<Announcement> => {
  if (!id) {
    return request.post('/admin/announcements', {
      electionFiefId: payload.electionFiefId,
      title: payload.title,
      body: payload.body,
      templateCode: payload.templateCode,
    });
  }
  return request.patch(`/admin/announcements/${id}`, toAnnouncementWritePayload(payload));
};

// 发布公告
export const publishAnnouncement = (id: string): Promise<void> =>
  request.post(`/admin/announcements/${id}/publish`);

// 上传公告附件
export const uploadAnnouncementFile = (id: string, file: File): Promise<MaterialFile> => {
  const fd = new FormData();
  fd.append('file', file);
  return request.post(`/admin/announcements/${id}/file`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// 删除公告附件
export const deleteAnnouncementFile = (id: string, fileId: string): Promise<void> =>
  request.delete(`/admin/announcements/${id}/file/${fileId}`);

// 获取指定公告的附件列表
export const getAnnouncementFiles = (id: string): Promise<MaterialFile[]> =>
  request.get(`/admin/announcements/${id}/files`);

