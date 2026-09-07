/**
 * ── 账号与组织模块：邀请 / 账号 / 归属地 ──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, hash, roleGuard, passwordHash } from '../lib';
import { randomBytes } from 'node:crypto';

export async function accountsRoutes(app: FastifyInstance) {
  // 邀请开账号（平台超管）
  app.post('/admin/invitations', { preHandler: roleGuard('platform_admin') }, async (req, rep) => {
    const b = z.object({ phone: z.string().min(5), role: z.enum(['sub_admin', 'editor', 'reviewer', 'candidate']), expiresInHours: z.number().int().positive().max(720).default(72), organizationId: z.string().uuid().optional() }).parse(req.body);
    const organizationId = b.organizationId ?? req.auth!.organizationId;
    if (req.auth!.role !== 'platform_admin' && organizationId !== req.auth!.organizationId) return rep.code(403).send({ error: 'organization_mismatch' });
    const token = randomBytes(32).toString('base64url');
    await pool!.query("insert into invitations(organization_id,phone,role,token_hash,expires_at,invited_by) values($1,$2,$3,$4,now()+($5 * interval '1 hour'),$6)", [organizationId, b.phone, b.role, hash(token), b.expiresInHours, req.auth!.userId]);
    return rep.code(201).send({ token, organizationId, role: b.role });
  });

  // 直建账号（超管可建任意归属地；子管理限建本归属地工作人员；默认密码 123456）
  app.post('/admin/accounts', { preHandler: roleGuard('platform_admin', 'sub_admin') }, async (req, rep) => {
    const b = z.object({ phone: z.string().min(5), displayName: z.string().optional(), role: z.enum(['sub_admin', 'editor', 'reviewer']), organizationId: z.string().uuid(), password: z.string().min(6).default('123456') }).parse(req.body);
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    // 子管理只能给自己归属地开账号，不能跨组织越权
    if (req.auth!.role === 'sub_admin' && b.organizationId !== req.auth!.organizationId) {
      return rep.code(403).send({ error: 'organization_mismatch' });
    }
    const org = (await pool!.query('select id from organizations where id=$1 and status=$2', [b.organizationId, 'active'])).rows[0];
    if (!org) return rep.code(404).send({ error: 'organization_not_found' });
    const exists = await pool!.query('select 1 from users where phone=$1', [b.phone]);
    if (exists.rowCount) return rep.code(409).send({ error: 'phone_already_registered' });
    const c = await pool!.connect();
    try {
      await c.query('begin');
      const u = (await c.query('insert into users(phone,password_hash,display_name) values($1,$2,$3) returning id', [b.phone, await passwordHash(b.password), b.displayName ?? b.phone])).rows[0];
      await c.query('insert into memberships(user_id,organization_id,role) values($1,$2,$3)', [u.id, b.organizationId, b.role]);
      await c.query('commit');
      return rep.code(201).send({ userId: u.id, organizationId: b.organizationId, role: b.role });
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  });

  // 归属地：建（超管）/ 列表（超管）
  app.post('/admin/organizations', { preHandler: roleGuard('platform_admin') }, async (req, rep) => {
    const b = z.object({ slug: z.string().regex(/^[a-z0-9-]+$/).min(2), name: z.string().min(1) }).parse(req.body);
    const r = await pool!.query("insert into organizations(slug,name,status) values($1,$2,'active') on conflict (slug) do nothing returning id,slug,name,status", [b.slug, b.name]);
    if (!r.rowCount) return rep.code(409).send({ error: 'organization_already_exists' });
    return rep.code(201).send(r.rows[0]);
  });
  app.get('/admin/organizations', { preHandler: roleGuard('platform_admin') }, async () => {
    return (await pool!.query('select id,slug,name,status,created_at from organizations order by created_at')).rows;
  });

  // 账号列表（超管看全部，子管理看本归属地）
  app.get('/admin/accounts', { preHandler: roleGuard('platform_admin', 'sub_admin') }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const orgId = (req.query as any)?.orgId as string | undefined;
    const isPlatform = req.auth!.role === 'platform_admin';
    const scopeOrg = isPlatform ? orgId : req.auth!.organizationId;
    const sql = `
      select u.id, u.phone, u.display_name as "displayName", u.status, u.created_at as "createdAt",
             m.organization_id as "orgId", o.name as "organizationName", m.role as "role"
      from users u
      join memberships m on m.user_id = u.id
      left join organizations o on o.id = m.organization_id
      where ($1::uuid is null or m.organization_id = $1)
        and m.role in ('platform_admin','sub_admin','editor','reviewer')
      order by o.name, m.role, u.created_at`;
    const rows = (await pool!.query(sql, [scopeOrg || null])).rows;
    return rows;
  });

  // 启用/停用账号
  app.put('/admin/accounts/:id/status', { preHandler: roleGuard('platform_admin', 'sub_admin') }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const b = z.object({ status: z.enum(['active', 'disabled']) }).parse(req.body);
    const { id } = req.params as { id: string };
    // 子管理只能操作本归属地账号
    if (req.auth!.role === 'sub_admin') {
      const own = (await pool!.query('select 1 from memberships where user_id=$1 and organization_id=$2', [id, req.auth!.organizationId])).rowCount;
      if (!own) return rep.code(403).send({ error: 'organization_mismatch' });
    }
    await pool!.query('update users set status=$1 where id=$2', [b.status, id]);
    return { id, status: b.status };
  });

  // 重置密码
  app.put('/admin/accounts/:id/reset-password', { preHandler: roleGuard('platform_admin', 'sub_admin') }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const b = z.object({ password: z.string().min(6).default('123456') }).parse(req.body);
    const { id } = req.params as { id: string };
    if (req.auth!.role === 'sub_admin') {
      const own = (await pool!.query('select 1 from memberships where user_id=$1 and organization_id=$2', [id, req.auth!.organizationId])).rowCount;
      if (!own) return rep.code(403).send({ error: 'organization_mismatch' });
    }
    await pool!.query('update users set password_hash=$1 where id=$2', [await passwordHash(b.password), id]);
    return { id, reset: true };
  });

  // 批量预设账号（解锁码校验，超管/子管理可用）
  app.post('/admin/accounts/preset', { preHandler: roleGuard('platform_admin', 'sub_admin') }, async (req, rep) => {
    if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
    const b = z.object({
      unlockCode: z.string(),
      orgId: z.string().uuid(),
      accounts: z.array(z.object({ name: z.string().optional(), phone: z.string().min(5), roleKey: z.enum(['sub_admin', 'editor', 'reviewer']), password: z.string().min(6).default('123456') })),
    }).parse(req.body);
    const expected = process.env.UNLOCK_CODE || '123456';
    if (b.unlockCode !== expected) return rep.code(403).send({ error: 'invalid_unlock_code' });
    // 子管理只能预设本归属地
    if (req.auth!.role === 'sub_admin' && b.orgId !== req.auth!.organizationId) return rep.code(403).send({ error: 'organization_mismatch' });
    const org = (await pool!.query('select id,name from organizations where id=$1', [b.orgId])).rows[0];
    if (!org) return rep.code(404).send({ error: 'organization_not_found' });
    const created: string[] = []; const updated: string[] = []; const skipped: { phone: string; reason: string }[] = [];
    const c = await pool!.connect();
    try {
      await c.query('begin');
      for (const a of b.accounts) {
        const exist = (await c.query('select id from users where phone=$1', [a.phone])).rows[0];
        if (exist) {
          const mem = (await c.query('select id from memberships where user_id=$1 and organization_id=$2', [exist.id, b.orgId])).rows[0];
          if (mem) {
            await c.query('update memberships set role=$1 where id=$2', [a.roleKey, mem.id]);
            if (a.name) await c.query('update users set display_name=$1 where id=$2', [a.name, exist.id]);
            updated.push(a.phone);
          } else {
            await c.query('insert into memberships(user_id,organization_id,role) values($1,$2,$3)', [exist.id, b.orgId, a.roleKey]);
            updated.push(a.phone);
          }
        } else {
          const u = (await c.query('insert into users(phone,password_hash,display_name) values($1,$2,$3) returning id', [a.phone, await passwordHash(a.password), a.name || a.phone])).rows[0];
          await c.query('insert into memberships(user_id,organization_id,role) values($1,$2,$3)', [u.id, b.orgId, a.roleKey]);
          created.push(a.phone);
        }
      }
      await c.query('commit');
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
    return { created, updated, skipped, orgId: b.orgId, orgName: org.name };
  });
}

