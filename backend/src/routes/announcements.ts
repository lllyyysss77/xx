/**
 * ── 公告模块：公告 / 模板 / 发布 / 候选人口径 + web 兼容 /api 口径 ──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, roleGuard, requirePerm, orgScope, fiefFor, notify, parsePagination, logDutyAction } from '../lib';

// ============================================================
// [TAG-INDEX] announcements.ts — 公告与模板（发布/编辑/模板/小程序公告）
// [ROUTE-CORE]   POST /admin/announcements — 创建公告
// [ROUTE-CORE]   GET  /admin/announcements — 公告列表
// [ROUTE-CORE]   PATCH /admin/announcements/:id — 编辑公告（白名单字段）
// [BREAKPOINT]    POST /admin/announcements/:id/publish — 公告发布（draft→published，法定留痕断点）
// [ROUTE-CORE]   GET  /admin/announcement-templates — 模板列表
// [ROUTE-CORE]   GET  /candidate/announcements — 小程序公告列表
// [CORE-FLOW]     公告附件上传/删除（biz-files 工厂模式，强外键）
// ============================================================
export async function announcementsRoutes(app: FastifyInstance) {
  // 创建公告（模板 or 手写）
  app.post('/admin/announcements', { preHandler: staff }, async (req, rep) => {
    const b = z.object({ electionFiefId: z.string().uuid(), title: z.string().min(1).optional(), body: z.string().min(1).optional(), templateCode: z.string().min(1).optional(), templateVersion: z.string().optional() }).refine(v => v.templateCode || v.title && v.body, { message: 'title_body_or_template_required' }).parse(req.body);
    const f = await fiefFor(b.electionFiefId, req, rep); if (!f) return;
    const t = b.templateCode ? (await pool!.query('select id,at_name,at_content from announcement_templates where at_code=$1 and at_version=$2 and active=true', [b.templateCode, b.templateVersion ?? '通用'])).rows[0] : undefined;
    if (b.templateCode && !t) return rep.code(404).send({ error: 'announcement_template_not_found' });
    const inserted = (await pool!.query('insert into announcements(election_fief_id,title,body,template_id,created_by,updated_by) values($1,$2,$3,$4,$5,$5) returning *', [f.id, b.title ?? t.at_name, b.body ?? t.at_content, t?.id ?? null, req.auth!.userId])).rows[0];

    // 履职留痕：创建公告草稿
    void logDutyAction({
      userId: req.auth!.userId,
      organizationId: f.organization_id,
      electionFiefId: f.id,
      actionType: 'create_announcement_draft',
      actionTitle: `创建公告草稿《${inserted.title}》`,
      details: { announcementId: inserted.id, templateId: t?.id ?? null },
      clientIp: req.ip,
    });

    return rep.code(201).send(inserted);
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
    const updated = (await pool!.query(
      `update announcements set ${sets.join(',')},updated_by=$${vals.length - 1},updated_at=now() where id=$${vals.length} returning *`,
      vals,
    )).rows[0];
    void logDutyAction({
      userId: req.auth!.userId,
      organizationId: r.organization_id,
      electionFiefId: r.election_fief_id,
      actionType: 'announcement_edit',
      actionTitle: `修改公告草稿《${updated.title || r.title}》`,
      details: { announcementId: id, changedFields: Object.keys(b) },
      clientIp: req.ip,
    });
    return updated;
  });
  // [BREAKPOINT] 公告发布 — 法定留痕断点：draft→published，乐观锁（仅 draft 可发布），发布后触发 webhook 通知
  // 发布断点：立即发布直接落 published；定时发布只在到点后由 schedulePendingAnnouncements 执行。
  const publishNow = async (id: string, actorId: string, organizationId: string, electionFiefId: string, clientIp?: string) => {
    const a = await pool!.query(
      "update announcements set status='published',published_by=$1,published_at=now(),updated_by=$1,updated_at=now() where id=$2 and status='draft' returning *",
      [actorId, id],
    );
    const pub = a.rows[0];
    if (!pub) return null;
    void logDutyAction({
      userId: actorId,
      organizationId,
      electionFiefId,
      actionType: 'announcement_publish',
      actionTitle: `法定正式发布《${pub.title}》`,
      details: { announcementId: id, publishAt: pub.published_at },
      clientIp,
    });
    void notify(organizationId, `【公告发布】《${pub.title}》已发布`);
    return pub;
  };

  const schedulePendingAnnouncements = async () => {
    const due = await pool!.query(
      `select a.id,a.created_by,a.election_fief_id,f.organization_id
       from announcements a join election_fiefs f on f.id=a.election_fief_id
       where a.status='draft' and a.ann_publish_mode='scheduled'
         and a.ann_publish_at is not null and a.ann_publish_at <= now()`,
    );
    for (const row of due.rows) {
      await publishNow(row.id, row.created_by, row.organization_id, row.election_fief_id);
    }
  };

  // 进程启动与后续每分钟各扫描一次；更新使用 status='draft' 条件，重复扫描不会重复发布。
  void schedulePendingAnnouncements().catch((err) => app.log.error(err, 'scheduled announcement startup scan failed'));
  const scheduleTimer = setInterval(() => {
    void schedulePendingAnnouncements().catch((err) => app.log.error(err, 'scheduled announcement scan failed'));
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(scheduleTimer));

  app.post('/admin/announcements/:id/publish', { preHandler: requirePerm('announcement:publish') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const r = (await pool!.query('select a.status,a.ann_publish_mode,a.ann_publish_at,a.election_fief_id,f.organization_id from announcements a join election_fiefs f on f.id=a.election_fief_id where a.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'announcement_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (r.status === 'published') return rep.code(409).send({ error: 'announcement_already_published' });
    if (r.ann_publish_mode === 'scheduled') {
      if (!r.ann_publish_at) return rep.code(400).send({ error: 'scheduled_publish_at_required' });
      if (new Date(r.ann_publish_at).getTime() > Date.now()) {
        return rep.code(202).send({ id, status: 'draft', scheduled: true, annPublishAt: r.ann_publish_at });
      }
    }
    const pub = await publishNow(id, req.auth!.userId, r.organization_id, r.election_fief_id, req.ip);
    if (!pub) return rep.code(409).send({ error: 'announcement_already_published' });
    return pub;
  });

  app.get('/admin/announcements', { preHandler: staff }, async (req, rep) => {
    const q = z.object({
      electionFiefId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).parse(req.query);
    const pg = parsePagination(q);
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      // [CORE-FLOW] 复用 election_fief_stages.stage_order 排序，与活动详情时间轴一一映射；同阶段按公告编号自然序（第2-1号紧跟第2号）
      const base = 'from announcements a left join announcement_templates t on t.id=a.template_id left join election_fief_stages efs on efs.election_fief_id=a.election_fief_id and efs.stage_key=a.stage_key where a.election_fief_id=$1';
      const order = "order by efs.stage_order, (regexp_match(t.at_code, '\\d+'))[1]::int, coalesce((regexp_match(t.at_code, '-(\\d+)'))[1]::int, 0)";
      const rows = (await pool!.query(`select a.*,t.at_name template_name,t.at_code template_code ${base} ${order} limit $${2} offset $${3}`, [f.id, pg.limit, pg.offset])).rows;
      if (!pg.paginated) return rows;
      const total = Number((await pool!.query(`select count(*)::int ${base}`, [f.id])).rows[0].count);
      return { items: rows, total, page: pg.page, pageSize: pg.pageSize };
    }
    // 跨活动查询：复用 stage_templates.st_order（村/居同序）
    const base = 'from announcements a left join announcement_templates t on t.id=a.template_id join election_fiefs f on f.id=a.election_fief_id left join lateral (select min(st_order) so from stage_templates where st_key=a.stage_key) st on true where f.organization_id=$1';
    const order = 'order by st.so, a.created_at';
    const rows = (await pool!.query(`select a.*,t.at_name template_name,t.at_code template_code ${base} ${order} limit $${2} offset $${3}`, [req.auth!.organizationId, pg.limit, pg.offset])).rows;
    if (!pg.paginated) return rows;
    const total = Number((await pool!.query(`select count(*)::int ${base}`, [req.auth!.organizationId])).rows[0].count);
    return { items: rows, total, page: pg.page, pageSize: pg.pageSize };
  });
  app.get('/admin/announcement-templates', { preHandler: staff }, async () => {
    return (await pool!.query('select * from announcement_templates where active=true order by at_code')).rows;
  });

  // 候选人口径（仅 published）
  app.get('/candidate/announcements', { preHandler: roleGuard('candidate') }, async (req) => {
    return (await pool!.query("select a.id,a.title,a.body,a.status,a.published_at,a.stage_key,t.at_code from announcements a left join announcement_templates t on t.id=a.template_id join election_fiefs f on f.id=a.election_fief_id where f.organization_id=$1 and a.status='published' order by a.published_at desc nulls last", [req.auth!.organizationId])).rows;
  });
}
