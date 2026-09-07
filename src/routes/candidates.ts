/**
 * ── 候选人模块：候选人池 + 轮次审核（R1~R4）──
 * 驳回不推进轮次：仅置 status='rejected'（current_round 约束只允许 R1~R4/complete）
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, pool, staff, requirePerm, roleGuard, orgScope, fiefFor, notify, addDays } from '../lib';

/** 依据 D 日倒排派生四轮审核窗口（村/居共用同一 D 日公式）
 *  R1 材料完整 / R2 镇·街道初审 / R3 区级联审 / R4 党委·党工委考察
 *  R1 提名窗口 = nominate_start(D-15) ~ nominate_cont 结束(D-14)
 *  R2 = prelim_shortlist(D-13, 1天) ；R3/R4 = joint_review(D-12, 6天)
 */
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

export async function candidatesRoutes(app: FastifyInstance) {
  app.get('/admin/candidates', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ electionFiefId: z.string().uuid().optional() }).parse(req.query);
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      const rows1 = (await pool!.query('select c.*,u.display_name,coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),\'[]\') reviews from candidates c join users u on u.id=c.user_id left join candidate_reviews cr on cr.candidate_id=c.id where c.election_fief_id=$1 group by c.id,u.display_name order by c.created_at', [f.id])).rows;
      for (const r of rows1) r.reviewWindows = buildReviewWindows({ d_day: f.d_day });
      return rows1;
    }
    const rows = (await pool!.query('select c.*,u.display_name,ef.d_day,coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),\'[]\') reviews from candidates c join users u on u.id=c.user_id left join candidate_reviews cr on cr.candidate_id=c.id join election_fiefs ef on ef.id=c.election_fief_id where ef.organization_id=$1 group by c.id,u.display_name,ef.d_day order by c.created_at', [req.auth!.organizationId])).rows;
    for (const r of rows) r.reviewWindows = buildReviewWindows({ d_day: r.d_day });
    return rows;
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

  app.post('/admin/candidates/:id/reviews', { preHandler: requirePerm('candidate:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ round: z.enum(['R1', 'R2', 'R3', 'R4']), decision: z.enum(['approved', 'rejected']), note: z.string().optional() }).parse(req.body);
    const r = (await pool!.query('select c.current_round,c.status,ef.organization_id from candidates c join election_fiefs ef on ef.id=c.election_fief_id where c.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'candidate_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    if (r.current_round !== b.round) return rep.code(409).send({ error: 'review_round_out_of_order' });
    await pool!.query('insert into candidate_reviews(candidate_id,round,reviewer_id,decision,note) values($1,$2,$3,$4,$5)', [id, b.round, req.auth!.userId, b.decision, b.note]);
    const rejected = b.decision === 'rejected';
    void notify(r.organization_id, `【候选人${b.round}】候选人第${b.round[1]}轮审核${b.decision === 'approved' ? '通过' : '驳回'}${b.note ? ' · ' + b.note : ''}`);
    return (await pool!.query('update candidates set current_round=$1,status=$2 where id=$3 returning *', [rejected ? b.round : b.round === 'R4' ? 'complete' : `R${Number(b.round[1]) + 1}`, rejected ? 'rejected' : b.round === 'R4' ? 'approved' : 'reviewing', id])).rows[0];
  });

  // 候选人全卷导出（一键下载）：聚合申报材料、四轮审核、附件清单与审核窗口，供落档/外送
  app.get('/admin/candidates/:id/export', { preHandler: requirePerm('candidate:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const row = (await pool!.query(`
      select c.*, u.display_name, u.phone, u.id_card_no, ef.organization_id, ef.name as fief_name, ef.d_day, ef.org_type,
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
      left join candidate_reviews cr on cr.candidate_id = c.id
      where c.id = $1
      group by c.id, u.display_name, u.phone, u.id_card_no, ef.organization_id, ef.name, ef.d_day, ef.org_type
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
