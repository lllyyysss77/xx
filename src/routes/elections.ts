/**
 * ── 选举活动模块：封地(届) / 日程实例 / 候选人口径 + web 兼容 /api 口径 ──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, roleGuard, orgScope, fiefFor, schedule, shanghaiDay, addDays } from '../lib';

export async function electionsRoutes(app: FastifyInstance) {
  // 手动建活动（超管/小编）；自动生成该 org_type 的日程模板实例
  app.post('/admin/election-fiefs', { preHandler: staff }, async (req, rep) => {
    const b = z.object({ organizationId: z.string().uuid().optional(), electionTermId: z.string().uuid(), unitId: z.string().uuid(), name: z.string().min(1), dDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.literal('Asia/Shanghai').default('Asia/Shanghai') }).parse(req.body);
    const org = b.organizationId ?? req.auth!.organizationId;
    if (!orgScope(org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const c = await pool!.connect();
    try {
      await c.query('begin');
      const r = (await c.query('insert into election_fiefs(election_term_id,organization_id,unit_id,name,d_day,timezone,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *', [b.electionTermId, org, b.unitId, b.name, b.dDay, b.timezone, req.auth!.userId])).rows[0];
      const orgType = (await c.query('select org_type from organizations where id=$1', [org])).rows[0]?.org_type ?? 'village';
      const templates = (await c.query('select * from stage_templates where active=true and org_type=$1 order by st_order', [orgType])).rows;
      for (const t of templates) await c.query('insert into election_fief_stages(election_fief_id,stage_template_id,stage_key,stage_name,start_date,end_date,stage_order) values($1,$2,$3,$4,$5,$6,$7)', [r.id, t.id, t.st_key, t.st_name, addDays(b.dDay, t.st_day_offset), addDays(b.dDay, t.st_day_offset + Math.max(0, t.st_duration_days - 1)), t.st_order]);
      await c.query('commit');
      return rep.code(201).send({ ...r, schedule: schedule(b.dDay), stagesGenerated: templates.length });
    } catch (e) { await c.query('rollback'); if ((e as { code?: string }).code === '23505') return rep.code(409).send({ error: 'election_fief_already_exists' }); throw e; } finally { c.release(); }
  });

  app.get('/admin/election-fiefs', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ organizationId: z.string().uuid().optional() }).parse(req.query);
    const org = q.organizationId ?? req.auth!.organizationId;
    if (!orgScope(org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    return (await pool!.query('select * from election_fiefs where organization_id=$1 order by d_day desc', [org])).rows;
  });
  app.get('/admin/election-fiefs/:id', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const r = (await pool!.query('select * from election_fiefs where id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'election_fief_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    // d_day 经 lib.ts 的 setTypeParser(1082) 全局改成原始字符串，不是 Date，直接 .toISOString() 会 500。
    return { ...r, schedule: schedule(String(r.d_day).slice(0, 10)) };
  });
  app.get('/admin/election-fiefs/:id/stages', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const f = await fiefFor(id, req, rep); if (!f) return;
    const rows = (await pool!.query('select * from election_fief_stages where election_fief_id=$1 order by stage_order', [id])).rows;
    const today = shanghaiDay();
    // 动态依据当前日期计算完成、进行中、未开始状态并响应
    return rows.map((r: any) => {
      const start = String(r.start_date).slice(0, 10);
      const end = String(r.end_date).slice(0, 10);
      let autoStatus = r.status;
      if (end < today) {
        autoStatus = 'completed';
      } else if (start <= today && today <= end) {
        autoStatus = 'in_progress';
      } else if (today < start) {
        autoStatus = 'not_started';
      }
      return { ...r, status: autoStatus };
    });
  });
  app.get('/admin/election-fiefs/:id/stage', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const r = (await pool!.query('select d_day,organization_id,status from election_fiefs where id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'election_fief_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const date = String(r.d_day), today = shanghaiDay();
    return { status: r.status, today, dDay: date, schedule: schedule(date), stage: today < date ? 'before' : today === date ? 'day' : 'after' };
  });
  app.patch('/admin/election-fiefs/:id/status', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ status: z.enum(['draft', 'active', 'closed']), version: z.number().int().positive() }).parse(req.body);
    const r = (await pool!.query('select organization_id,status from election_fiefs where id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'election_fief_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (r.status !== b.status && !((r.status === 'draft' && b.status === 'active') || (r.status === 'active' && b.status === 'closed'))) return rep.code(409).send({ error: 'invalid_status_transition' });
    const u = await pool!.query('update election_fiefs set status=$1,version=version+1 where id=$2 and version=$3 returning *', [b.status, id, b.version]);
    if (!u.rowCount) return rep.code(409).send({ error: 'version_conflict' });
    return u.rows[0];
  });

  // ── 候选人口径只读（小程序端数据源；只看本归属地，公告仅 published）──
  app.get('/candidate/elections', { preHandler: roleGuard('candidate') }, async (req) => {
    return (await pool!.query('select f.id,f.name,f.d_day,f.status,t.name term_name from election_fiefs f join election_terms t on t.id=f.election_term_id where f.organization_id=$1 order by f.d_day desc', [req.auth!.organizationId])).rows;
  });
  app.get('/candidate/elections/:id/stages', { preHandler: roleGuard('candidate') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const f = await fiefFor(id, req, rep); if (!f) return;
    return (await pool!.query('select stage_key,stage_name,start_date,end_date,stage_order,status from election_fief_stages where election_fief_id=$1 order by stage_order', [id])).rows;
  });


  // 归档台账：从已完成封地聚合提案/公告/材料/附件
  const archivesHandler = async (req: any, rep: any) => {
    if (!pool) return [];
    const org = req.auth!.organizationId;
    const isPlatform = req.auth!.role === 'platform_admin';
    // 归档范围：支持本组织历史及当期所有活动文件，包括已完成和推进中的封地附件
    const fiefSql = `select id, organization_id from election_fiefs where 1=1${isPlatform ? '' : ' and organization_id=$1'}`;
    const fiefs = (await pool.query(fiefSql, isPlatform ? [] : [org])).rows;
    if (!fiefs.length) return [];
    const fiefIds = fiefs.map(f => f.id);
    const orgIds = [...new Set(fiefs.map(f => f.organization_id))];
    // 公告（announcements 表没有 organization_id，通过 join election_fiefs 获取 orgId）
    const ann = (await pool.query(`select a.id, a.election_fief_id as "elId", a.title as "archDisplayName", f.organization_id as "orgId" from announcements a join election_fiefs f on f.id=a.election_fief_id where a.status='published' and a.election_fief_id = any($1)`, [fiefIds])).rows;
    // 材料
    const mat = (await pool.query(`select m.id, m.election_fief_id as "elId", coalesce(u.display_name,'参选人')||'的报名材料' as "archDisplayName", f.organization_id as "orgId" from materials m join election_fiefs f on f.id=m.election_fief_id left join users u on u.id=m.candidate_user_id where m.status='approved' and m.election_fief_id = any($1)`, [fiefIds])).rows;
    // 提案：elId 取审批通过时自动创建的封地 id（created_fief_id）；老数据按本组织最新封地兜底
    const prop = (await pool.query(
      `select p.id, coalesce(p.created_fief_id, lf.fief_id, p.organization_id) as "elId", p.name as "archDisplayName", p.organization_id as "orgId"
       from election_proposals p
       left join lateral (
         select f.id as fief_id from election_fiefs f
         where f.organization_id = p.organization_id
         order by f.d_day desc nulls last, f.created_at desc limit 1
       ) lf on true
       where p.status='approved' and p.organization_id = any($1)`,
      [orgIds])).rows;

    // ── 附件文件归档（所有上传到 uploads 的业务文件都要在历史台账可溯、可下载）──
    // 提案附件：随提案挂到其自动创建的封地（无则按组织最新封地兜底）
    const pf = (await pool.query(
      `select pf.id, coalesce(p.created_fief_id, lf.fief_id, p.organization_id) as "elId", pf.file_name as "archDisplayName", p.organization_id as "orgId", pf.storage_key as "storageKey"
       from proposal_files pf
       join election_proposals p on p.id=pf.proposal_id
       left join lateral (
         select f.id as fief_id from election_fiefs f
         where f.organization_id = p.organization_id
         order by f.d_day desc nulls last, f.created_at desc limit 1
       ) lf on true
       where p.status='approved' and p.organization_id = any($1)`,
      [orgIds])).rows;
    // 公告附件：经封地
    const af = (await pool.query(`select af.id, a.election_fief_id as "elId", af.file_name as "archDisplayName", f.organization_id as "orgId", af.storage_key as "storageKey"
      from announcement_files af join announcements a on a.id=af.announcement_id join election_fiefs f on f.id=a.election_fief_id
      where a.election_fief_id = any($1)`, [fiefIds])).rows;
    // 岗位附件：经封地
    const posf = (await pool.query(`select posf.id, p.election_fief_id as "elId", posf.file_name as "archDisplayName", f.organization_id as "orgId", posf.storage_key as "storageKey"
      from position_files posf join positions p on p.id=posf.position_id join election_fiefs f on f.id=p.election_fief_id
      where p.election_fief_id = any($1)`, [fiefIds])).rows;
    // 材料附件：经材料封地（材料审核通过）
    const mf = (await pool.query(`select mf.id, m.election_fief_id as "elId", mf.file_name as "archDisplayName", f.organization_id as "orgId", mf.storage_key as "storageKey"
      from material_files mf join materials m on m.id=mf.material_id join election_fiefs f on f.id=m.election_fief_id
      where m.status='approved' and m.election_fief_id = any($1)`, [fiefIds])).rows;

    const all = [
      ...prop.map(r => ({ ...r, archSourceType: 'proposal', archVisibility: 'internal', archFileVersion: 'v1' })),
      ...ann.map(r => ({ ...r, archSourceType: 'announcement', archVisibility: 'public', archFileVersion: 'v1' })),
      ...mat.map(r => ({ ...r, archSourceType: 'material', archVisibility: 'internal', archFileVersion: 'v1' })),
      ...pf.map(r => ({ ...r, archSourceType: 'proposal_file', archVisibility: 'internal', archFileVersion: 'v1' })),
      ...af.map(r => ({ ...r, archSourceType: 'announcement_file', archVisibility: 'public', archFileVersion: 'v1' })),
      ...posf.map(r => ({ ...r, archSourceType: 'position_file', archVisibility: 'internal', archFileVersion: 'v1' })),
      ...mf.map(r => ({ ...r, archSourceType: 'material_file', archVisibility: 'internal', archFileVersion: 'v1' })),
    ];
    return all;
  };
  app.get('/admin/archives', { preHandler: staff }, archivesHandler);
}
