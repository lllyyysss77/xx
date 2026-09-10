/**
 * ── 认证模块：组织/登录/登出/注册/改密 ──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, hash, auth, passwordHash, passwordOk, login } from '../lib';

// ============================================================
// [TAG-INDEX] auth.ts — 认证（登录/注册/组织列表/登出）
// [AUTH]  POST /auth/admin/login — 管理员登录（三要素：phone+password+organizationId）
// [AUTH]  POST /auth/candidate/login — 参选人登录
// [AUTH]  POST /auth/register — 参选人注册（自动建 memberships，on conflict 幂等）
// [ROUTE-CORE] GET /auth/organizations — 活跃归属地列表（登录页下拉）
// [AUTH]  POST /auth/logout — 登出（删 session）
// ============================================================
export async function authRoutes(app: FastifyInstance) {
  // orgType 是给前端的驼峰别名：前端 OrgItem 只读 orgType，缺了它登录页下拉永远为空（登不进去）。
  // 保留 org_type 原字段，供小程序/旧 web 等蛇形消费者继续用，属纯加法改动。
  app.get('/auth/organizations', async () => {
    if (!pool) return [];
    const { rows } = await pool.query(
      "select id,slug,name,org_type,org_type as \"orgType\",status from organizations where status='active' order by org_type,name"
    );
    return rows;
  });

  app.post('/auth/logout', { preHandler: auth }, async (req, rep) => {
    const token = req.headers.authorization!.replace(/^Bearer\s+/i, '');
    await pool!.query('delete from sessions where token_hash=$1', [hash(token)]);
    return rep.send({ ok: true, revoked: true });
  });

  app.post('/auth/register', async (req, rep) => {
    const b = z.object({ phone: z.string().min(5), password: z.string().min(6), displayName: z.string().optional(), organizationId: z.string().uuid() }).parse(req.body);
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const org = (await pool.query("select id from organizations where id=$1 and status='active'", [b.organizationId])).rows[0];
    if (!org) return rep.code(404).send({ error: 'organization_not_found' });
    const exists = await pool.query('select 1 from users where phone=$1', [b.phone]);
    if (exists.rowCount) return rep.code(409).send({ error: 'phone_already_registered' });
    const role = 'candidate' as const;
    const c = await pool.connect();
    try {
      await c.query('begin');
      const u = (await c.query('insert into users(phone,password_hash,display_name) values($1,$2,$3) returning id', [b.phone, await passwordHash(b.password), b.displayName])).rows[0];
      await c.query('insert into memberships(user_id,organization_id,role) values($1,$2,$3) on conflict (user_id, organization_id) do nothing', [u.id, b.organizationId, role]);
      await c.query('commit');
      return rep.code(201).send({ userId: u.id, organizationId: b.organizationId });
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  });

  app.post('/auth/change-password', { preHandler: auth }, async (req, rep) => {
    const b = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(6) }).parse(req.body);
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const u = (await pool!.query('select password_hash from users where id=$1', [req.auth!.userId])).rows[0];
    if (!u || !(await passwordOk(b.oldPassword, u.password_hash))) return rep.code(401).send({ error: 'invalid_old_password' });
    await pool!.query('update users set password_hash=$1 where id=$2', [await passwordHash(b.newPassword), req.auth!.userId]);
    return { ok: true };
  });

  app.post('/auth/admin/login', async (req, rep) => login(req, rep, ['platform_admin', 'sub_admin', 'editor', 'reviewer']));
  app.post('/auth/candidate/login', async (req, rep) => login(req, rep, ['candidate']));
}
