/**
 * ── 角色与权限模块（超管后台可配置）──
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, requirePerm } from '../lib';

// ============================================================
// [TAG-INDEX] roles.ts — 角色与权限管理
// [AUTH]  GET /admin/roles — 角色列表（含权限点）
// [AUTH]  POST /admin/roles — 创建角色
// [AUTH]  PATCH /admin/roles/:key — 编辑角色权限
// [ROUTE-CORE] GET /admin/permissions — 全部权限点清单
// ============================================================
export async function rolesRoutes(app: FastifyInstance) {
  app.get('/admin/roles', { preHandler: requirePerm('role:manage') }, async () => {
    return (await pool!.query(`select r.key,r.name,r.is_staff,r.is_system,coalesce((select json_agg(p.permission order by p.permission) from role_permissions p where p.role_key=r.key),'[]') permissions from roles r order by r.key`)).rows;
  });
  app.get('/admin/role-permissions', { preHandler: requirePerm('role:manage') }, async () => {
    return (await pool!.query(`select permission,max(description) description from role_permissions group by permission order by permission`)).rows;
  });

  app.post('/admin/roles', { preHandler: requirePerm('role:manage') }, async (req, rep) => {
    const b = z.object({ key: z.string().min(1).regex(/^[a-z0-9_]+$/), name: z.string().min(1), isStaff: z.boolean().default(false), permissions: z.array(z.string()).default([]) }).parse(req.body);
    const c = await pool!.connect();
    try {
      await c.query('begin');
      await c.query('insert into roles(key,name,is_staff,is_system) values($1,$2,$3,false)', [b.key, b.name, b.isStaff]);
      for (const p of b.permissions) await c.query('insert into role_permissions(role_key,permission) values($1,$2)', [b.key, p]);
      await c.query('commit');
      return rep.code(201).send({ key: b.key, name: b.name, permissions: b.permissions });
    } catch (e) { await c.query('rollback'); if ((e as { code?: string }).code === '23505') return rep.code(409).send({ error: 'role_already_exists' }); throw e; } finally { c.release(); }
  });

  app.patch('/admin/roles/:key', { preHandler: requirePerm('role:manage') }, async (req, rep) => {
    const key = z.string().parse((req.params as { key: string }).key);
    const b = z.object({ name: z.string().optional(), permissions: z.array(z.string()).optional() }).parse(req.body);
    const r = (await pool!.query('select is_system from roles where key=$1', [key])).rows[0];
    if (!r) return rep.code(404).send({ error: 'role_not_found' });
    if (r.is_system && b.permissions !== undefined) return rep.code(409).send({ error: 'system_role_frozen' });
    const c = await pool!.connect();
    try {
      await c.query('begin');
      if (b.name) await c.query('update roles set name=$1 where key=$2', [b.name, key]);
      if (b.permissions) {
        await c.query('delete from role_permissions where role_key=$1', [key]);
        for (const p of b.permissions) await c.query('insert into role_permissions(role_key,permission) values($1,$2)', [key, p]);
      }
      await c.query('commit');
      return { key };
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  });

  app.delete('/admin/roles/:key', { preHandler: requirePerm('role:manage') }, async (req, rep) => {
    const key = z.string().parse((req.params as { key: string }).key);
    const r = (await pool!.query('select is_system from roles where key=$1', [key])).rows[0];
    if (!r) return rep.code(404).send({ error: 'role_not_found' });
    if (r.is_system) return rep.code(409).send({ error: 'system_role_frozen' });
    const c = await pool!.connect();
    try {
      await c.query('begin');
      await c.query('delete from role_permissions where role_key=$1', [key]);
      await c.query('delete from roles where key=$1', [key]);
      await c.query('commit');
      return { ok: true, key };
    } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  });
}
