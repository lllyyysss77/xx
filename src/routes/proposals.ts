/**
 * ── 提案模块：选举提案 / 岗位 / 审批联动（通过→建活动+日程+岗位+公告）──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, requirePerm, roleGuard, orgScope, fiefFor, addDays, notify, saveUploadPart } from '../lib';

export async function proposalsRoutes(app: FastifyInstance) {
  // 创建提案（小编提交，超管审批；term/unit 未传时自动回填该组织 active 届 + 首个单位）
  app.post('/admin/proposals', { preHandler: requirePerm('proposal:create') }, async (req, rep) => {
    const b = z.object({
      organizationId: z.string().uuid().optional(),
      termId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      name: z.string().min(1),
      dDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      positions: z.array(z.object({
        name: z.string().min(1),
        quota: z.number().int().positive(),
        requirement: z.string().optional(),
        electionMethod: z.string().optional(),
        sampleFileName: z.string().optional(),
        sampleStorageKey: z.string().optional(),
        sampleSizeBytes: z.number().optional(),
        sampleMimeType: z.string().optional(),
      })).max(10).optional(),
    }).parse(req.body);
    // 归属地默认取当前登录后台，无需小编手填；超管可显式指定
    const organizationId = b.organizationId ?? req.auth!.organizationId;
    if (!organizationId || !orgScope(organizationId, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const o = (await pool!.query('select org_type,name from organizations where id=$1', [organizationId])).rows[0];
    if (!o) return rep.code(404).send({ error: 'organization_not_found' });
    // term / unit 未传时自动兜底：active 届；该组织无单位则按组织名自动建一个
    let termId = b.termId;
    let unitId = b.unitId;
    if (!termId) {
      termId = (await pool!.query("select id from election_terms where status='active' order by created_at desc limit 1")).rows[0]?.id ?? null;
    }
    if (!unitId) {
      unitId = (await pool!.query('select id from election_units where organization_id=$1 order by created_at limit 1', [organizationId])).rows[0]?.id ?? null;
      if (!unitId) {
        unitId = (await pool!.query('insert into election_units(organization_id,name) values($1,$2) returning id', [organizationId, o.name])).rows[0].id;
      }
    }
    if (!termId) return rep.code(409).send({ error: 'no_active_election_term' });
    // 每村可创建多个选举提案（不做 org+term 排他）
    const ps = b.positions ?? [{ name: '主任', quota: 1 }, { name: '副主任', quota: 1 }, { name: '委员', quota: 3 }, { name: '妇女成员', quota: 1 }];
    const r = await pool!.query('insert into election_proposals(organization_id,term_id,unit_id,name,d_day,org_type,positions,proposed_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *', [organizationId, termId, unitId, b.name, b.dDay, o.org_type, JSON.stringify(ps), req.auth!.userId]);
    return rep.code(201).send(r.rows[0]);
  });

  app.get('/admin/proposals', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ organizationId: z.string().uuid().optional() }).parse(req.query);
    const org = q.organizationId ?? req.auth!.organizationId;
    if (!orgScope(org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    return (await pool!.query(`select p.*,o.name organization_name,
      coalesce((select json_agg(json_build_object(
        'id',pf.id,'fileName',pf.file_name,'mimeType',pf.mime_type,
        'sizeBytes',pf.size_bytes,'storageKey',pf.storage_key,'createdAt',pf.created_at
      ) order by pf.created_at) from proposal_files pf where pf.proposal_id=p.id),'[]') files
      from election_proposals p join organizations o on o.id=p.organization_id
      where p.organization_id=$1 order by p.created_at desc`, [org])).rows;
  });

  // 编辑提案（仅 pending 状态可改；已审核的禁止修改；严格要求 proposal:create 权限，禁止审核人 reviewer 越权修改）
  app.patch('/admin/proposals/:id', { preHandler: requirePerm('proposal:create') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({
      name: z.string().min(1).optional(),
      dDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      positions: z.array(z.object({
        name: z.string().min(1),
        quota: z.number().int().positive(),
        requirement: z.string().optional(),
        electionMethod: z.string().optional(),
        sampleFileName: z.string().optional(),
        sampleStorageKey: z.string().optional(),
        sampleSizeBytes: z.number().optional(),
        sampleMimeType: z.string().optional(),
      })).max(10).optional(),
    }).parse(req.body);
    const p = (await pool!.query('select * from election_proposals where id=$1', [id])).rows[0];
    if (!p) return rep.code(404).send({ error: 'proposal_not_found' });
    if (p.status !== 'pending') return rep.code(409).send({ error: 'proposal_already_reviewed' });
    if (!orgScope(p.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (b.name !== undefined) { sets.push(`name=$${i}`); vals.push(b.name); i++; }
    if (b.dDay !== undefined) { sets.push(`d_day=$${i}`); vals.push(b.dDay); i++; }
    if (b.positions !== undefined) { sets.push(`positions=$${i}`); vals.push(JSON.stringify(b.positions)); i++; }
    if (!sets.length) return rep.code(400).send({ error: 'no_fields_to_update' });
    vals.push(id);
    const r = await pool!.query(`update election_proposals set ${sets.join(',')} where id=$${i} returning *`, vals);
    return r.rows[0];
  });

  // 审批：驳回→置 rejected；通过→事务内建活动+日程+岗位+公告+标记 approved
  app.post('/admin/proposals/:id/review', { preHandler: requirePerm('proposal:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ decision: z.enum(['approved', 'rejected']), note: z.string().optional() }).parse(req.body);
    const p = (await pool!.query('select * from election_proposals where id=$1', [id])).rows[0];
    if (!p) return rep.code(404).send({ error: 'proposal_not_found' });
    if (p.status !== 'pending') return rep.code(409).send({ error: 'proposal_already_reviewed' });
    if (!orgScope(p.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (b.decision === 'rejected') {
      const d = await pool!.query('update election_proposals set status=$1,reviewed_by=$2,reviewed_at=now(),reject_reason=$4 where id=$3 returning *', ['rejected', req.auth!.userId, id, b.note ?? '']);
      void notify(p.organization_id, `【提案审批】「${p.name}」已驳回${b.note ? ' · ' + b.note : ''}`);
      return d.rows[0];
    }
    const c = await pool!.connect();
    try {
      await c.query('begin');
      // 每村可建多个选举活动（不做届/村/单位排他）
      const orgType = p.org_type ?? 'village';
      const f = (await c.query('insert into election_fiefs(election_term_id,organization_id,unit_id,name,d_day,timezone,status,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *', [p.term_id, p.organization_id, p.unit_id, p.name, p.d_day, 'Asia/Shanghai', 'active', req.auth!.userId])).rows[0];
      const templates = (await c.query('select * from stage_templates where active=true and org_type=$1 order by st_order', [orgType])).rows;
      for (const t of templates) await c.query('insert into election_fief_stages(election_fief_id,stage_template_id,stage_key,stage_name,start_date,end_date,stage_order) values($1,$2,$3,$4,$5,$6,$7)', [f.id, t.id, t.st_key, t.st_name, addDays(p.d_day, t.st_day_offset), addDays(p.d_day, t.st_day_offset + Math.max(0, t.st_duration_days - 1)), t.st_order]);
      const appStart = addDays(p.d_day, -15), appEnd = addDays(p.d_day, -13);
      const positions = typeof p.positions === 'string' ? JSON.parse(p.positions) : p.positions;
      for (const po of positions) {
        const pRow = (await c.query(
          `insert into positions(election_fief_id,name,quota,application_start,application_end,material_review_start,material_review_end,election_method,requirement)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
          [f.id, po.name, po.quota, appStart, appEnd, appStart, appEnd, po.electionMethod || po.election_method || '全民直接选举', po.requirement || null]
        )).rows[0];

        // 提案中设置的每个岗位专属报名表/资格审查样表附件，审批通过时单事务落盘录入 position_files
        if (po.sampleStorageKey && pRow?.id) {
          await c.query(
            `insert into position_files(position_id,file_name,mime_type,size_bytes,storage_key,created_by)
             values($1,$2,$3,$4,$5,$6)`,
            [
              pRow.id,
              po.sampleFileName || `${po.name}参选报名表.docx`,
              po.sampleMimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              po.sampleSizeBytes || 0,
              po.sampleStorageKey,
              req.auth!.userId,
            ]
          );
        }
      }
      // 提取届次中文名（如“第十五届”）
      const termRow = p.term_id ? (await c.query('select name from election_terms where id=$1', [p.term_id])).rows[0] : null;
      const termName = termRow?.name || '第十五届';
      const orgName = (await c.query('select name from organizations where id=$1', [p.organization_id])).rows[0]?.name || '村委会';
      const isCommunity = orgType === 'community';
      const defaultSign = isCommunity ? `${orgName}居民选举委员会` : `${orgName}村民选举委员会`;
      const defaultSignDate = p.d_day ? `${p.d_day.slice(0, 4)}年${p.d_day.slice(5, 7)}月${p.d_day.slice(8, 10)}日` : '2027年05月18日';

      const ats = await c.query('select * from announcement_templates where active=true and at_sched_offset is not null order by at_sched_offset');
      let pub = 0;
      for (const a of ats.rows) {
        const d = addDays(p.d_day, a.at_sched_offset);
        let title = isCommunity ? a.at_name.replace('村民', '居民').replace('村务监督', '居务监督') : a.at_name;
        title = title.replace(/第十四届/g, termName).replace(/第14届/g, termName);

        let body = a.at_content;
        if (isCommunity) {
          body = body
            .replace(/村民选举委员会/g, '居民选举委员会')
            .replace(/村民代表/g, '居民代表')
            .replace(/村民会议/g, '居民会议')
            .replace(/村民/g, '居民')
            .replace(/乡镇党委/g, '街道党工委')
            .replace(/乡镇人民政府/g, '街道办事处')
            .replace(/乡镇/g, '街道');
        // 注：仅“乡镇党委”转“街道党工委”；不可全局 /党委/g 替换，否则会把“社区党委/党总支”等正常称谓误改
        }
        // 动态灌入真实组织名称、届次、选举日，彻底消除未填写的下划线
        body = body
          .replace(/______镇\(街道\)______村/g, orgName)
          .replace(/______镇\(街道\)/g, orgName.slice(0, 3) + '街道')
          .replace(/______村/g, orgName)
          .replace(/第十四届/g, termName)
          .replace(/第14届/g, termName)
          .replace(/本届/g, termName);

        // 匹配所属阶段 stage_key
        const st = templates.find((t: any) => t.st_day_offset === a.at_sched_offset || Math.abs(t.st_day_offset - a.at_sched_offset) <= 2);
        const stageKey = st?.st_key || (a.at_sched_offset <= -33 ? 'stage_02' : a.at_sched_offset <= -15 ? 'stage_08' : a.at_sched_offset <= -6 ? 'stage_11' : 'stage_12');

        await c.query(
          `insert into announcements(
            election_fief_id,title,body,template_id,created_by,updated_by,scheduled_for,
            stage_key,ann_sign,ann_sign_date,ann_publish_mode,ann_remind_hours,ann_remind_to
          ) values($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,'immediate',24,'editor,admin')`,
          [f.id, title, body, a.id, req.auth!.userId, d, stageKey, defaultSign, defaultSignDate]
        );
        pub++;
      }
      await c.query('update election_proposals set status=$1,reviewed_by=$2,reviewed_at=now(),created_fief_id=$4 where id=$3', ['approved', req.auth!.userId, id, f.id]);
      await c.query('commit');
      void notify(p.organization_id, `【提案审批】「${p.name}」已通过，选举活动已启动（${p.d_day}）`);
      return rep.code(201).send({ fiefId: f.id, stages: templates.length, positions: positions.length, announcements: pub, dDay: p.d_day, orgType });
    } catch (e) { await c.query('rollback'); if ((e as { code?: string }).code === '23505') return rep.code(409).send({ error: 'election_fief_already_exists' }); throw e; } finally { c.release(); }
  });

  // 提案阶段“新增岗位”样表附件上传：此时岗位/封地尚未建，不能走 /admin/positions/:id/file。
  // 统一落盘后只返回 storageKey/文件名等元数据，由前端随岗位对象带入提案；审批通过时再落 position_files。
  app.post('/admin/proposals/sample-file', { preHandler: requirePerm('proposal:create') }, async (req, rep) => {
    const part = await req.file();
    if (!part) return rep.code(400).send({ error: 'no_file' });
    const meta = await saveUploadPart(part, { orgId: req.auth!.organizationId, fiefId: null, sourceType: 'position' });
    return rep.code(201).send(meta);
  });


  app.get('/admin/positions', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ electionFiefId: z.string().uuid().optional() }).parse(req.query);
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      return (await pool!.query(`
        select p.*,
          coalesce((
            select json_agg(json_build_object(
              'id', pf.id, 'fileName', pf.file_name, 'mimeType', pf.mime_type,
              'sizeBytes', pf.size_bytes, 'storageKey', pf.storage_key, 'createdAt', pf.created_at
            ) order by pf.created_at)
            from position_files pf where pf.position_id = p.id
          ), '[]') as files
        from positions p 
        where p.election_fief_id=$1 
        order by p.application_start, p.created_at
      `, [f.id])).rows;
    }
    return (await pool!.query(`
      select p.*,
        coalesce((
          select json_agg(json_build_object(
            'id', pf.id, 'fileName', pf.file_name, 'mimeType', pf.mime_type,
            'sizeBytes', pf.size_bytes, 'storageKey', pf.storage_key, 'createdAt', pf.created_at
          ) order by pf.created_at)
          from position_files pf where pf.position_id = p.id
        ), '[]') as files
      from positions p 
      join election_fiefs f on f.id=p.election_fief_id 
      where f.organization_id=$1 
      order by p.application_start, p.created_at
    `, [req.auth!.organizationId])).rows;
  });
  // 参选人岗位查询：按角色守卫（与其他 /candidate/* 同口径）。requirePerm('candidate') 是错的——
  // 权限表里没有名为 'candidate' 的权限点，会导致参选人真实 token 被 403（2026-09-05 端到端实测抓出）
  app.get('/candidate/positions', { preHandler: roleGuard('candidate') }, async (req) => {
    return (await pool!.query('select p.id,p.name,p.quota,p.status,p.application_start,p.application_end,p.material_review_start,p.material_review_end from positions p join election_fiefs f on f.id=p.election_fief_id where f.organization_id=$1 order by p.name', [req.auth!.organizationId])).rows;
  });

}
