/**
 * ── 提案模块：选举提案 / 岗位 / 审批联动（通过→建活动+日程+岗位+公告）──
 * [FIXED P0-日程 2026-09-09] st_duration_days 是结束偏移量不是持续天数，详见 L132 注释。
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, requirePerm, roleGuard, orgScope, fiefFor, addDays, notify, saveUploadPart, parsePagination } from '../lib';

/**
 * 文号→阶段映射已下沉为单一数据源：announcement_templates.stage_key（数据库列）
 * 前端镜像见 web/src/utils/docxRules.ts；新增/调整文号只改数据库，无需改代码。
 */

// ============================================================
// [TAG-INDEX] proposals.ts — 核心业务流：提案→审批→生成活动/日程/岗位/公告
// [ROUTE-CORE]  L9     POST /admin/proposals — 提案创建
// [ROUTE-CORE]  L51    GET  /admin/proposals — 提案列表
// [ROUTE-CORE]  L75    PATCH /admin/proposals/:id — 提案编辑（仅 pending）
// [BREAKPOINT]   L108   POST /admin/proposals/:id/review — 提案审批（核心状态转换：pending→approved/rejected）
// [CORE-FLOW]    L125-211 审批通过事务：建活动→建日程→建岗位→自动生成公告（单事务原子性）
// [CORE-FLOW]    L166-206 公告自动生成（按 at_code→stage_key 法定映射，村/居双轨替换）
// [ROUTE-CORE]  L216   POST /admin/proposals/sample-file — 岗位样表上传
// [ROUTE-CORE]  L224   GET  /admin/positions — 岗位列表
// [ROUTE-CORE]  L255   GET  /candidate/positions — 参选人岗位查询
// [TODO-FIX P1-2] L110-115 审批 body 为空时默认走 approve（应至少要求 decision/action 非空）
// [TODO-FIX P1-3] L133/139 material_review_start/end = application_start/end（材料审核窗口=报名窗口，业务可疑）
// [FIXED P0-挂载 2026-09-09] 公告 stage_key 改用 ANN_STAGE_BY_CODE，不再偏移猜测
// ============================================================
export async function proposalsRoutes(app: FastifyInstance) {
  // 创建提案（小编提交，超管审批；term/unit 未传时自动回填该组织 active 届 + 首个单位）
  // [ROUTE-CORE] 提案创建入口 — 小编提交，超管审批；term/unit 未传时自动回填
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
    const q = z.object({
      organizationId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).parse(req.query);
    const org = q.organizationId ?? req.auth!.organizationId;
    if (!orgScope(org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const pg = parsePagination(q);
    const base = 'from election_proposals p join organizations o on o.id=p.organization_id where p.organization_id=$1';
    const sel = `select p.*,o.name organization_name,
      coalesce((select json_agg(json_build_object(
        'id',pf.id,'fileName',pf.file_name,'mimeType',pf.mime_type,
        'sizeBytes',pf.size_bytes,'storageKey',pf.storage_key,'createdAt',pf.created_at
      ) order by pf.created_at) from proposal_files pf where pf.proposal_id=p.id),'[]') files`;
    const rows = (await pool!.query(`${sel} ${base} order by p.created_at desc limit $${2} offset $${3}`, [org, pg.limit, pg.offset])).rows;
    if (!pg.paginated) return rows;
    const total = Number((await pool!.query(`select count(*)::int ${base}`, [org])).rows[0].count);
    return { items: rows, total, page: pg.page, pageSize: pg.pageSize };
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
  // [BREAKPOINT] 提案审批 — 核心状态转换点：pending→approved/rejected；通过则单事务建活动+日程+岗位+公告
  app.post('/admin/proposals/:id/review', { preHandler: requirePerm('proposal:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({
      action: z.enum(['approve', 'reject', 'approved', 'rejected']).optional(),
      decision: z.enum(['approved', 'rejected']).optional(),
      note: z.string().optional()
    }).parse(req.body);
    const isReject = b.decision === 'rejected' || b.action === 'reject' || b.action === 'rejected';
    const p = (await pool!.query('select * from election_proposals where id=$1', [id])).rows[0];
    if (!p) return rep.code(404).send({ error: 'proposal_not_found' });
    if (p.status !== 'pending' && p.status !== 'submitted') return rep.code(409).send({ error: 'proposal_already_reviewed' });
    if (!orgScope(p.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (isReject) {
      const d = await pool!.query('update election_proposals set status=$1,reviewed_by=$2,reviewed_at=now(),reject_reason=$4 where id=$3 returning *', ['rejected', req.auth!.userId, id, b.note ?? '']);
      void notify(p.organization_id, `【提案审批】「${p.name}」已驳回${b.note ? ' · ' + b.note : ''}`);
      return d.rows[0];
    }
    // [CORE-FLOW] 审批通过事务起点 — 单事务原子性：建活动→建日程→建岗位→生成公告→标记 approved，任一失败整体回滚
    const c = await pool!.connect();
    try {
      await c.query('begin');
      // 每村可建多个选举活动（不做届/村/单位排他）
      const orgType = p.org_type ?? 'village';
      const f = (await c.query('insert into election_fiefs(election_term_id,organization_id,unit_id,name,d_day,timezone,status,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *', [p.term_id, p.organization_id, p.unit_id, p.name, p.d_day, 'Asia/Shanghai', 'active', req.auth!.userId])).rows[0];
      const templates = (await c.query('select * from stage_templates where active=true and org_type=$1 order by st_order', [orgType])).rows;
      // [FIXED P0-日程 2026-09-09] st_duration_days 字段 = 「结束日相对于 D 日的偏移量」，不是「持续天数」！
      //   历史错用公式：end_date = d_day + st_day_offset + max(0, st_duration_days - 1)
      //     该公式只有当 st_duration_days 存的是“持续天数”时才正确。
      //     但本系统的数据库字段（stage_templates.st_duration_days）存的是结束日偏移，
      //     对 D 日前的负偏移阶段，max(0, 负数-1) = 0，导致所有 D 日前的多天阶段全部被压缩成单日，
      //     直接违反法定公示/登记期限（如选民登记应为 D-33~D-29 共 5 天，错算成只有 1 天）。
      //   正确公式：start_date = d_day + st_day_offset
      //            end_date   = d_day + st_duration_days   （与 rebuild-db.mjs 种子数据生成逻辑一致）
      //   为什么不用手写判断大月小月？——底层 addDays() 使用 Date.prototype.setUTCDate()，
      //     由 V8 引擎底层的格里高利历自动处理 28/29/30/31 天与闰年平年，精准且不会引入分支漏洞。
      // [字段速查表 · 必须死记]
      //   st_day_offset    → 阶段开始日 = D日 + st_day_offset     （负值 = D 日前）
      //   st_duration_days → 阶段结束日 = D日 + st_duration_days   （⚠️ 不是持续天数！是结束偏移！）
      // [范例 · 选民登记 D-33 ~ D-29]
      //   st_day_offset = -33 → 开始日 = 2026-10-18 + (-33) = 2026-09-15
      //   st_duration_days = -29 → 结束日 = 2026-10-18 + (-29) = 2026-09-19
      //   持续天数 = 5 天（含首尾两天）
      for (const t of templates) await c.query('insert into election_fief_stages(election_fief_id,stage_template_id,stage_key,stage_name,start_date,end_date,stage_order) values($1,$2,$3,$4,$5,$6,$7)', [f.id, t.id, t.st_key, t.st_name, addDays(p.d_day, t.st_day_offset), addDays(p.d_day, t.st_duration_days), t.st_order]);
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

      // [CORE-FLOW] 公告自动生成 — 全量 active 模板；stage_key 直接取模板表（单一数据源，与 docxRules/stage_templates 对齐，禁止再硬编码映射）
      const ats = await c.query('select * from announcement_templates where active=true');
      let pub = 0;
      for (const a of ats.rows) {
        const stageKey = a.stage_key;
        if (!stageKey) continue; // 模板未配阶段则不派生，避免脏挂载
        const stageTpl = templates.find((t: any) => t.st_key === stageKey);
        // scheduled_for：有 at_sched_offset 用偏移；无偏移（代表选举类）用所属阶段开始日偏移
        const schedOff = a.at_sched_offset ?? stageTpl?.st_day_offset ?? 0;
        const d = addDays(p.d_day, schedOff);
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
    const q = z.object({
      electionFiefId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).parse(req.query);
    const pg = parsePagination(q);
    const fileSub = `coalesce((
            select json_agg(json_build_object(
              'id', pf.id, 'fileName', pf.file_name, 'mimeType', pf.mime_type,
              'sizeBytes', pf.size_bytes, 'storageKey', pf.storage_key, 'createdAt', pf.created_at
            ) order by pf.created_at)
            from position_files pf where pf.position_id = p.id
          ), '[]') as files`;
    const order = 'order by p.application_start, p.created_at';
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      const rows = (await pool!.query(`select p.*, ${fileSub} from positions p where p.election_fief_id=$1 ${order} limit $${2} offset $${3}`, [f.id, pg.limit, pg.offset])).rows;
      if (!pg.paginated) return rows;
      const total = Number((await pool!.query('select count(*)::int from positions p where p.election_fief_id=$1', [f.id])).rows[0].count);
      return { items: rows, total, page: pg.page, pageSize: pg.pageSize };
    }
    const rows = (await pool!.query(`select p.*, ${fileSub} from positions p join election_fiefs f on f.id=p.election_fief_id where f.organization_id=$1 ${order} limit $${2} offset $${3}`, [req.auth!.organizationId, pg.limit, pg.offset])).rows;
    if (!pg.paginated) return rows;
    const total = Number((await pool!.query('select count(*)::int from positions p join election_fiefs f on f.id=p.election_fief_id where f.organization_id=$1', [req.auth!.organizationId])).rows[0].count);
    return { items: rows, total, page: pg.page, pageSize: pg.pageSize };
  });
  // 参选人岗位查询：按角色守卫（与其他 /candidate/* 同口径）。requirePerm('candidate') 是错的——
  // 权限表里没有名为 'candidate' 的权限点，会导致参选人真实 token 被 403（2026-09-05 端到端实测抓出）
  app.get('/candidate/positions', { preHandler: roleGuard('candidate') }, async (req) => {
    return (await pool!.query('select p.id,p.name,p.quota,p.status,p.application_start,p.application_end,p.material_review_start,p.material_review_end from positions p join election_fiefs f on f.id=p.election_fief_id where f.organization_id=$1 order by p.name', [req.auth!.organizationId])).rows;
  });

}
