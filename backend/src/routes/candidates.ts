/**
 * ── 候选人模块：候选人池 + 轮次审核（R1~R4）──
 * 驳回不推进轮次：仅置 status='rejected'（current_round 约束只允许 R1~R4/complete）
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, pool, staff, requirePerm, roleGuard, orgScope, fiefFor, notify, addDays, parsePagination } from '../lib';

/** 依据 D 日倒排派生四轮审核窗口（村/居共用同一 D 日公式）
 *  R1 材料完整 / R2 镇·街道初审 / R3 区级联审 / R4 党委·党工委考察
 *  R1 提名窗口 = nominate_start(D-15) ~ nominate_cont 结束(D-14)
 *  R2 = prelim_shortlist(D-13, 1天) ；R3/R4 = joint_review(D-12, 6天)
 */
// [CORE-FLOW] 四轮审核窗口派生 — 按 D 日倒排：R1(D-15~-14) R2(D-13) R3/R4(D-12~-7)
function buildReviewWindows(f: { d_day: string; org_type?: string } | undefined) {
  if (!f?.d_day) return null;
  const d = f.d_day;
  // 四轮审核窗口由 D 日倒排派生（村/居同公式）；R4 考察文案区分党委/党工委
  const r4 = f.org_type === 'community' ? '考察' : '考察';
  return {
    round1: { key: 'R1', name: '材料完整', start: addDays(d, -15), end: addDays(d, -14) },
    round2: { key: 'R2', name: '初审', start: addDays(d, -13), end: addDays(d, -13) },
    round3: { key: 'R3', name: '联审', start: addDays(d, -12), end: addDays(d, -7) },
    round4: { key: 'R4', name: r4, start: addDays(d, -12), end: addDays(d, -7) },
  };
}

/** 取封地（含 d_day）并校验归属，供候选人接口复用 */
async function fiefWithDay(id: string, req: FastifyRequest, rep: FastifyReply) {
  const f = (await pool!.query('select id,organization_id,d_day from election_fiefs where id=$1', [id])).rows[0];
  if (!f) { rep.code(404).send({ error: 'election_fief_not_found' }); return null; }
  if (!orgScope(f.organization_id, req)) { rep.code(403).send({ error: 'organization_mismatch' }); return null; }
  return f;
}

// ============================================================
// [TAG-INDEX] candidates.ts — 候选人池 + 四轮联审（R1~R4）
// [CORE-FLOW]    L13-24  buildReviewWindows — 按 D 日倒排派生四轮审核窗口
// [ROUTE-CORE]   L35     GET /admin/candidates — 候选人列表
// [ROUTE-CORE]   L63     GET /admin/candidates/:id — 候选人全卷详情
// [BREAKPOINT]   L96-117 reviewCandidateHandler — 轮次审核核心断点（R1→R2→R3→R4→complete）
// [BREAKPOINT]   L116    轮次推进与状态转换（通过→下一轮，驳回→保持当前轮）
// [ROUTE-CORE]   L119-120 双路由契约 /reviews 与 /review（消除调用歧义）
// [ROUTE-CORE]   L123    GET /admin/candidates/:id/export — 全卷导出
// [ROUTE-CORE]   L157    POST /admin/candidates/:id/send — 外发送审
// [ROUTE-CORE]   L180    GET /candidate/candidates — 小程序参选人围观战况
// [TODO-FIX P1-1] L106   body 为空时 decision 默认 approved（应至少要求 decision/result 非空）
// [TODO-FIX P1-1] L109-116 驳回后 status='rejected' 但无状态闸，可再次审核通过（应拦截非 reviewing 状态）
// [TODO-FIX P2]   L17    r4 三目两分支同值（'考察'/'考察'），死代码
// [TODO-FIX P2]   L21-22 R3/R4 窗口相同（D-12~D-7），业务上联审与考察同期
// ============================================================
export async function candidatesRoutes(app: FastifyInstance) {
  app.get('/admin/candidates', { preHandler: staff }, async (req, rep) => {
    const q = z.object({
      electionFiefId: z.string().uuid().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    }).parse(req.query);
    const pg = parsePagination(q);
    const deco = (rows: any[], dDay?: string) => { for (const r of rows) r.reviewWindows = buildReviewWindows({ d_day: dDay ?? r.d_day }); return rows; };
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      const fromWhere = 'from candidates c join users u on u.id=c.user_id left join candidate_reviews cr on cr.candidate_id=c.id where c.election_fief_id=$1';
      const agg = `select c.*,u.display_name,coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),'[]') reviews ${fromWhere} group by c.id,u.display_name`;
      const rows = (await pool!.query(`${agg} order by c.created_at limit $${2} offset $${3}`, [f.id, pg.limit, pg.offset])).rows;
      if (!pg.paginated) return deco(rows, f.d_day);
      const total = Number((await pool!.query('select count(*)::int from candidates c where c.election_fief_id=$1', [f.id])).rows[0].count);
      return { items: deco(rows, f.d_day), total, page: pg.page, pageSize: pg.pageSize };
    }
    const fromWhere = 'from candidates c join users u on u.id=c.user_id left join candidate_reviews cr on cr.candidate_id=c.id join election_fiefs ef on ef.id=c.election_fief_id where ef.organization_id=$1';
    const agg = `select c.*,u.display_name,ef.d_day,coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),'[]') reviews ${fromWhere} group by c.id,u.display_name,ef.d_day`;
    const rows = (await pool!.query(`${agg} order by c.created_at limit $${2} offset $${3}`, [req.auth!.organizationId, pg.limit, pg.offset])).rows;
    if (!pg.paginated) return deco(rows);
    const total = Number((await pool!.query('select count(*)::int from candidates c join election_fiefs ef on ef.id=c.election_fief_id where ef.organization_id=$1', [req.auth!.organizationId])).rows[0].count);
    return { items: deco(rows), total, page: pg.page, pageSize: pg.pageSize };
  });

  // 单候选人全卷详情（含申报材料、审查轮次与附件）：解决前端 404 与档案穿透问题
  app.get('/admin/candidates/:id', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const row = (await pool!.query(`
      select c.*, u.display_name, u.phone, ef.organization_id, ef.d_day, ef.org_type, ef.name as fief_name,
        coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null), '[]') as reviews,
        (
          select json_build_object(
            'id', m.id, 'title', m.title, 'status', m.status,
            'submittedAt', m.submitted_at, 'reviewNote', m.review_note,
            'files', coalesce((
              select json_agg(json_build_object(
                'id', mf.id, 'fileName', mf.file_name, 'storageKey', mf.storage_key,
                'mimeType', mf.mime_type, 'sizeBytes', mf.size_bytes, 'createdAt', mf.created_at
              ) order by mf.created_at)
              from material_files mf where mf.material_id = m.id
            ), '[]')
          )
          from materials m where m.id = c.material_id
        ) as material
      from candidates c
      join users u on u.id = c.user_id
      join election_fiefs ef on ef.id = c.election_fief_id
      left join candidate_reviews cr on cr.candidate_id = c.id
      where c.id = $1
      group by c.id, u.display_name, u.phone, ef.organization_id, ef.d_day, ef.org_type, ef.name
    `, [id])).rows[0];
    if (!row) return rep.code(404).send({ error: 'candidate_not_found' });
    if (!orgScope(row.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    row.reviewWindows = buildReviewWindows({ d_day: row.d_day, org_type: row.org_type });
    return row;
  });

  // 轮次审查（支持单数 review 与复数 reviews 两种路由契约，彻底消除调用歧义）
  // [BREAKPOINT] 轮次审核核心处理器 — 候选人资格审查的关键状态转换点（R1→R2→R3→R4→complete）
  const reviewCandidateHandler = async (req: FastifyRequest, rep: FastifyReply) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({
      round: z.enum(['R1', 'R2', 'R3', 'R4']),
      decision: z.enum(['approved', 'rejected']).optional(),
      result: z.enum(['passed', 'rejected', 'approved']).optional(),
      note: z.string().optional(),
      reviewNote: z.string().optional(),
      docNumber: z.string().optional()
    }).parse(req.body);
    const decision = b.decision || (b.result === 'rejected' ? 'rejected' : 'approved');
    const note = b.note || b.reviewNote || (b.docNumber ? `[文号: ${b.docNumber}]` : '');

    const r = (await pool!.query('select c.current_round,c.status,ef.organization_id from candidates c join election_fiefs ef on ef.id=c.election_fief_id where c.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'candidate_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (r.current_round !== b.round) return rep.code(409).send({ error: 'review_round_out_of_order' });
    await pool!.query('insert into candidate_reviews(candidate_id,round,reviewer_id,decision,note) values($1,$2,$3,$4,$5)', [id, b.round, req.auth!.userId, decision, note]);
    const rejected = decision === 'rejected';
    void notify(r.organization_id, `【候选人${b.round}】候选人第${b.round[1]}轮审核${decision === 'approved' ? '通过' : '驳回'}${note ? ' · ' + note : ''}`);
    // [BREAKPOINT] 轮次推进与状态转换 — 通过→下一轮(R+1)，R4通过→complete/approved；驳回→保持当前轮+status=rejected
    return (await pool!.query('update candidates set current_round=$1,status=$2 where id=$3 returning *', [rejected ? b.round : b.round === 'R4' ? 'complete' : `R${Number(b.round[1]) + 1}`, rejected ? 'rejected' : b.round === 'R4' ? 'approved' : 'reviewing', id])).rows[0];
  };

  app.post('/admin/candidates/:id/reviews', { preHandler: requirePerm('candidate:review') }, reviewCandidateHandler);
  app.post('/admin/candidates/:id/review', { preHandler: requirePerm('candidate:review') }, reviewCandidateHandler);

  // 候选人全卷导出（一键下载）：聚合申报材料、四轮审核、附件清单与审核窗口，供落档/外送
  app.get('/admin/candidates/:id/export', { preHandler: requirePerm('candidate:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const row = (await pool!.query(`
      select c.*, u.display_name, u.phone, ef.organization_id, ef.name as fief_name, ef.d_day, o.org_type,
        coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null), '[]') as reviews,
        (
          select json_build_object(
            'title', m.title, 'description', m.description, 'status', m.status,
            'submittedAt', m.submitted_at, 'reviewNote', m.review_note,
            'files', coalesce((
              select json_agg(json_build_object(
                'fileName', mf.file_name, 'mimeType', mf.mime_type, 'sizeBytes', mf.size_bytes,
                'storageKey', mf.storage_key, 'createdAt', mf.created_at
              ) order by mf.created_at)
              from material_files mf where mf.material_id = m.id
            ), '[]')
          )
          from materials m where m.id = c.material_id
        ) as material
      from candidates c
      join users u on u.id = c.user_id
      join election_fiefs ef on ef.id = c.election_fief_id
      join organizations o on o.id = ef.organization_id
      left join candidate_reviews cr on cr.candidate_id = c.id
      where c.id = $1
      group by c.id, u.display_name, u.phone, ef.organization_id, ef.name, ef.d_day, o.org_type
    `, [id])).rows[0];
    if (!row) return rep.code(404).send({ error: 'candidate_not_found' });
    if (!orgScope(row.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    row.reviewWindows = buildReviewWindows({ d_day: row.d_day, org_type: row.org_type });
    return row;
  });

  // 候选人送审：整理全卷后外送（对接 webhook 订阅；生产可扩展为抄送外部邮箱）。返回送审包 + 触发通知
  app.post('/admin/candidates/:id/send', { preHandler: requirePerm('candidate:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ email: z.string().email().optional(), note: z.string().optional() }).parse(req.body ?? {});
    const row = (await pool!.query(`
      select c.id, u.display_name, u.phone, ef.organization_id, ef.name as fief_name,
        coalesce(json_agg(distinct mf.file_name), '[]') file_names,
        count(distinct mf.id) file_count
      from candidates c
      join users u on u.id=c.user_id
      join election_fiefs ef on ef.id=c.election_fief_id
      left join materials m on m.id=c.material_id
      left join material_files mf on mf.material_id=m.id
      where c.id=$1 group by c.id,u.display_name,u.phone,ef.organization_id,ef.name
    `, [id])).rows[0];
    if (!row) return rep.code(404).send({ error: 'candidate_not_found' });
    if (!orgScope(row.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const subject = `送审【${row.fief_name}】${row.display_name} 候选人全卷${row.file_count ? `（${row.file_count} 个附件）` : ''}`;
    const content = `${subject}\n参选人：${row.display_name}（${row.phone}）\n附件：${row.file_names.join('、') || '无'}${b.note ? '\n送审意见：' + b.note : ''}`;
    await notify(row.organization_id, content, undefined, undefined);
    return { submitted: true, target: b.email ?? 'webhook', subject, content, fileCount: row.file_count, files: row.file_names };
  });

  // 小程序端参选人围观战况专属接口（按登录态归属地天然隔离）
  app.get('/candidate/candidates', { preHandler: roleGuard('candidate') }, async (req) => {
    const rows = (await pool!.query(`
      select c.id,c.election_fief_id,u.display_name,u.phone,c.status,c.current_round,
             coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),'[]') reviews
      from candidates c
      join users u on u.id=c.user_id
      join election_fiefs f on f.id=c.election_fief_id
      left join candidate_reviews cr on cr.candidate_id=c.id
      where f.organization_id=$1
      group by c.id,u.display_name,u.phone
      order by c.created_at
    `, [req.auth!.organizationId])).rows;
    return rows;
  });
}
