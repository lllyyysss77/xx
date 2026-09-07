/**
 * ── 候选人模块：候选人池 + 轮次审核（R1~R4）──
 * 驳回不推进轮次：仅置 status='rejected'（current_round 约束只允许 R1~R4/complete）
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, requirePerm, roleGuard, orgScope, fiefFor, notify } from '../lib';

export async function candidatesRoutes(app: FastifyInstance) {
  app.get('/admin/candidates', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ electionFiefId: z.string().uuid().optional() }).parse(req.query);
    if (q.electionFiefId) {
      const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return;
      return (await pool!.query('select c.*,u.display_name,coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),\'[]\') reviews from candidates c join users u on u.id=c.user_id left join candidate_reviews cr on cr.candidate_id=c.id where c.election_fief_id=$1 group by c.id,u.display_name order by c.created_at', [f.id])).rows;
    }
    return (await pool!.query('select c.*,u.display_name,coalesce(json_agg(cr order by cr.created_at) filter (where cr.id is not null),\'[]\') reviews from candidates c join users u on u.id=c.user_id left join candidate_reviews cr on cr.candidate_id=c.id join election_fiefs ef on ef.id=c.election_fief_id where ef.organization_id=$1 group by c.id,u.display_name order by c.created_at', [req.auth!.organizationId])).rows;
  });

  // 单候选人全卷详情（含申报材料、审查轮次与附件）：解决前端 404 与档案穿透问题
  app.get('/admin/candidates/:id', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const row = (await pool!.query(`
      select c.*, u.display_name, u.phone, ef.organization_id, ef.name as fief_name,
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
      group by c.id, u.display_name, u.phone, ef.organization_id, ef.name
    `, [id])).rows[0];
    if (!row) return rep.code(404).send({ error: 'candidate_not_found' });
    if (!orgScope(row.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
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
