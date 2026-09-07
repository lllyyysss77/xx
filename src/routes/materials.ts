/**
 * ── 材料模块：参选人报名材料 + 附件 ──
 * 审核通过 → 自动进候选人池（R1 待审）
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, roleGuard, requirePerm, orgScope, fiefFor, notify, passwordHash } from '../lib';

export async function materialsRoutes(app: FastifyInstance) {
  // 内推代建材料（小编/子管理；无候选人账号则自动创建，默认密码 123456）
  app.post('/admin/materials', { preHandler: staff }, async (req, rep) => {
    const b = z.object({ electionFiefId: z.string().uuid(), phone: z.string().min(5), name: z.string().optional(), title: z.string().optional(), description: z.string().optional() }).parse(req.body);
    const f = await fiefFor(b.electionFiefId, req, rep); if (!f) return;
    let u = (await pool!.query('select id from users where phone=$1', [b.phone])).rows[0];
    if (!u) {
      const c = await pool!.connect();
      try {
        await c.query('begin');
        u = (await c.query('insert into users(phone,password_hash,display_name) values($1,$2,$3) returning id', [b.phone, await passwordHash('123456'), b.name ?? b.phone])).rows[0];
        await c.query('insert into memberships(user_id,organization_id,role) values($1,$2,$3) on conflict (user_id, organization_id) do nothing', [u.id, req.auth!.organizationId, 'candidate']);
        await c.query('commit');
      } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
    }
    const m = (await pool!.query('insert into materials(election_fief_id,candidate_user_id,title,description) values($1,$2,$3,$4) returning *', [f.id, u.id, b.title ?? `报名材料-${b.name ?? b.phone}`, b.description])).rows[0];
    return rep.code(201).send(m);
  });
  // 参选人提交材料（可带 files 元数据；文件本体先走 /files/upload）
  app.post('/candidate/materials', { preHandler: roleGuard('candidate') }, async (req, rep) => {
    const b = z.object({ electionFiefId: z.string().uuid(), title: z.string().min(1), description: z.string().optional(), files: z.array(z.object({ fileName: z.string().min(1), mimeType: z.string().optional(), sizeBytes: z.number().int().nonnegative().optional(), storageKey: z.string().optional() })).default([]) }).parse(req.body);
    const f = await fiefFor(b.electionFiefId, req, rep); if (!f) return;
    const c = await pool!.connect();
    try {
      await c.query('begin');
      const m = (await c.query("insert into materials(election_fief_id,candidate_user_id,title,description) values($1,$2,$3,$4) returning *", [f.id, req.auth!.userId, b.title, b.description])).rows[0];
      for (const file of b.files) await c.query('insert into material_files(material_id,file_name,mime_type,size_bytes,storage_key) values($1,$2,$3,$4,$5)', [m.id, file.fileName, file.mimeType, file.sizeBytes, file.storageKey]);
      await c.query('commit');
      return rep.code(201).send(m);
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  });
  app.get('/candidate/materials', { preHandler: roleGuard('candidate') }, async (req) => {
    return (await pool!.query('select m.*,coalesce(json_agg(mf) filter (where mf.id is not null),\'[]\') files from materials m join election_fiefs f on f.id=m.election_fief_id and f.organization_id=$2 left join material_files mf on mf.material_id=m.id where m.candidate_user_id=$1 group by m.id order by m.submitted_at desc', [req.auth!.userId, req.auth!.organizationId])).rows;
  });

  // 后台材料列表：带活动查该活动；不带则返回本 org 全部（前端首页/届列表需要跨届计数）
  app.get('/admin/materials', { preHandler: staff }, async (req, rep) => {
    const q = z.object({ electionFiefId: z.string().uuid().optional() }).parse(req.query);
    if (q.electionFiefId) { const f = await fiefFor(q.electionFiefId, req, rep); if (!f) return; }
    const cond = q.electionFiefId ? 'm.election_fief_id=$1' : 'f.organization_id=$1';
    return (await pool!.query(`
      select m.*,u.display_name submitter_name,u.phone submitter_phone,c.id candidate_id,
             f.name fief_name,f.d_day fief_d_day,
             coalesce(json_agg(mf) filter (where mf.id is not null),'[]') files
      from materials m
      join election_fiefs f on f.id=m.election_fief_id
      join users u on u.id=m.candidate_user_id
      left join candidates c on c.material_id=m.id
      left join material_files mf on mf.material_id=m.id
      where ${cond}
      group by m.id,u.display_name,u.phone,c.id,f.name,f.d_day
      order by m.submitted_at desc
    `, [q.electionFiefId ?? req.auth!.organizationId])).rows;
  });

  // 审核：通过 → 自动进候选人池（幂等）
  app.patch('/admin/materials/:id/review', { preHandler: requirePerm('material:review') }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ status: z.enum(['approved', 'rejected']), note: z.string().optional() }).parse(req.body);
    const r = (await pool!.query('select m.id,f.organization_id from materials m join election_fiefs f on f.id=m.election_fief_id where m.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'material_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const u = await pool!.query('update materials set status=$1,reviewed_at=now(),reviewed_by=$2,review_note=$3 where id=$4 returning *', [b.status, req.auth!.userId, b.note, id]);
    if (b.status === 'approved') await pool!.query('insert into candidates(election_fief_id,user_id,material_id) select election_fief_id,candidate_user_id,id from materials where id=$1 on conflict (election_fief_id,user_id) do nothing', [id]);
    void notify(r.organization_id, `【材料审核】候选人报名材料已${b.status === 'approved' ? '通过' : '驳回'}${b.note ? ' · ' + b.note : ''}`);
    return u.rows[0];
  });

  // 追加附件（先 /files/upload 拿 storageKey 再关联）
  app.post('/admin/materials/:id/file', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ storageKey: z.string().min(1), fileName: z.string().min(1), mimeType: z.string().optional(), sizeBytes: z.number().int().nonnegative().optional() }).parse(req.body);
    const r = (await pool!.query('select m.id,f.organization_id from materials m join election_fiefs f on f.id=m.election_fief_id where m.id=$1', [id])).rows[0];
    if (!r) return rep.code(404).send({ error: 'material_not_found' });
    if (!orgScope(r.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const f = (await pool!.query('insert into material_files(material_id,file_name,mime_type,size_bytes,storage_key) values($1,$2,$3,$4,$5) returning *', [id, b.fileName, b.mimeType, b.sizeBytes, b.storageKey])).rows[0];
    return rep.code(201).send(f);
  });
}
