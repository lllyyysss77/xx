/**
 * ── 公告模块：公告 / 模板 / 发布 / 候选人口径 + web 兼容 /api 口径 ──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, roleGuard, requirePerm, orgScope, fiefFor, notify } from '../lib';

export async function announcementsRoutes(app: FastifyInstance) {
  // 创建公告（模板 or 手写）
  app.post('/admin/announcements', { preHandler: staff }, async (req, rep) => {
    const b = z.object({ electionFiefId: z.string().uuid(), title: z.string().min(1).optional(), body: z.string().min(1).optional(), templateCode: z.string().min(1).optional(), templateVersion: z.string().optional() }).refine(v => v.templateCode || v.title && v.body, { message: 'title_body_or_template_required' }).parse(req.body);
    const f = await fiefFor(b.electionFiefId, req, rep); if (!f) return;
    const t = b.templateCode ? (await pool!.query('select id,at_name,at_content from announcement_templates where at_code=$1 and at_version=$2 and active=true', [b.templateCode, b.templateVersion ?? '通用'])).rows[0] : undefined;
    if (b.templateCode && !t) return rep.code(404).send({ error: 'announcement_template_not_found' });
    return rep.code(201).send((await pool!.query('insert into announcements(election_fief_id,title,body,template_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning *', [f.id, b.title ?? t.at_name, b.body ?? t.at_content, t?.id ?? null, req.auth!.userId])).rows[0]);
  });
  // 小编工作台可编辑字段白名单：前端驼峰 -> 库列（参数化，列名白名单防注入）
  const ANN_EDIT_COLS: Record<string, string> = {
    title: 'title', body: 'body', sign: 'ann_sign', signDate: 'ann_sign_date',
    openMaterialSubmit: 'ann_open_material_submit', publishMode: 'ann_publish_mode',
    publishAt: 'ann_publish_at', remindHours: 'ann_remind_hours', remindTo: 'ann_remind_to',
  };
  app.patch('/admin/announcements/:id', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({
      title: z.string().min(1).optional(), body: z.string().min(1).optional(),
      sign: z.string().optional(), signDate: z.string().optional(),
      openMaterialSubmit: z.boolean().optional(),
      publishMode: z.enum(['immediate', 'scheduled']).optional(),
      publishAt: z.string().nullable().optional(),
      remindHours: z.number().int().optional(),
      remindTo: z.string().optional(),
    }).parse(req.body);
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, col] of Object.entries(ANN_EDIT_COLS)) {
      const v = (b as Record<string, unknown>)[k];
      if (v === undefined) continue;
      vals.push(k === 'publishAt' && v === '' ? null : v); // 清空定时时间
      sets.push(`${col}=$${vals.length}`);
    }
    if (!sets.length) return rep.code(400).send({ error: 'no_fields_to_update' });
    const r = (await pool!.query('select a.*,f.organization_id from announcements a join election_fiefs f on f.id=a.election_fief_id where a.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'announcement_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (r.status === 'published') return rep.code(409).send({ error: 'announcement_already_published' });
    vals.push(req.auth!.userId, id);
    return (await pool!.query(
      `update announcements set ${sets.join(',')},updated_by=$${vals.length - 1},updated_at=now() where id=$${vals.length} returning *`,
      vals,
    )).rows[0];
  });
  app.post('/admin/announcements/:id/publish', { preHandler: requirePerm('announcement:publish') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const r = (await pool!.query('select a.status,f.organization_id from announcements a join election_fiefs f on f.id=a.election_fief_id where a.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'announcement_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (r.status === 'published') return rep.code(409).send({ error: 'announcement_already_published' });
    const a = await pool!.query("update announcements set status='published',published_by=$1,published_at=now(),updated_by=$1,updated_at=now() where id=$2 and status='draft' returning *", [req.auth!.userId, id]);
    void notify(r.organization_id, `【公告发布】《${a.rows[0]?.title ?? ''}》已发布`);
    return a.rows[0];
  });

  app.get('/admin/announcements', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ electionFiefId: z.string().uuid().optional() }).parse(req.query);
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      return (await pool!.query('select a.*,t.at_name template_name,t.at_code template_code from announcements a left join announcement_templates t on t.id=a.template_id where a.election_fief_id=$1 order by a.ann_publish_at nulls last,a.created_at desc', [f.id])).rows;
    }
    return (await pool!.query('select a.*,t.at_name template_name,t.at_code template_code from announcements a left join announcement_templates t on t.id=a.template_id join election_fiefs f on f.id=a.election_fief_id where f.organization_id=$1 order by a.ann_publish_at nulls last,a.created_at desc', [req.auth!.organizationId])).rows;
  });
  app.get('/admin/announcement-templates', { preHandler: staff }, async () => {
    return (await pool!.query('select * from announcement_templates where active=true order by at_code')).rows;
  });

  // 候选人口径（仅 published）
  app.get('/candidate/announcements', { preHandler: roleGuard('candidate') }, async (req) => {
    return (await pool!.query("select a.id,a.title,a.body,a.status,a.published_at,a.stage_key,t.at_code from announcements a left join announcement_templates t on t.id=a.template_id join election_fiefs f on f.id=a.election_fief_id where f.organization_id=$1 and a.status='published' order by a.published_at desc nulls last", [req.auth!.organizationId])).rows;
  });

}
