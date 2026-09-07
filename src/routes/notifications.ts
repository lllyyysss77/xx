/**
 * ── 通知模块：webhook 订阅（企业微信/飞书/plain(Bark 类)）──
 * 配置页 + 测试推送；真正下发走 lib.notify
 */
import type { FastifyInstance } from 'fastify';
import { z, pool, staff, orgScope } from '../lib';

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/admin/webhook-subscriptions', { preHandler: staff }, async (req, rep) => {
    const org = req.auth!.organizationId;
    if (!orgScope(org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    return (await pool!.query('select * from webhook_subscriptions where organization_id=$1 order by created_at', [org])).rows;
  });
  app.post('/admin/webhook-subscriptions', { preHandler: staff }, async (req, rep) => {
    const b = z.object({ organizationId: z.string().uuid().optional(), name: z.string().min(1), channel: z.enum(['wecom', 'feishu', 'plain']), url: z.string().regex(/^https?:\/\//), mobile: z.string().optional() }).parse(req.body);
    const org = b.organizationId ?? req.auth!.organizationId;
    if (!orgScope(org, req)) return rep.code(403).send({ error: 'organization_mismatch' });
    const r = (await pool!.query('insert into webhook_subscriptions(organization_id,name,channel,url,mobile,created_by) values($1,$2,$3,$4,$5,$6) returning *', [org, b.name, b.channel, b.url, b.mobile ?? null, req.auth!.userId])).rows[0];
    return rep.code(201).send(r);
  });
  app.patch('/admin/webhook-subscriptions/:id', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const b = z.object({ name: z.string().optional(), url: z.string().regex(/^https?:\/\//).optional(), mobile: z.string().nullable().optional(), active: z.boolean().optional() }).parse(req.body);
    const r = (await pool!.query('update webhook_subscriptions set name=coalesce($2,name),url=coalesce($3,url),mobile=$4,active=coalesce($5,active) where id=$1 and organization_id=$6 returning *', [id, b.name, b.url, b.mobile ?? null, b.active, req.auth!.organizationId])).rows[0];
    if (!r) return rep.code(404).send({ error: 'subscription_not_found' });
    return r;
  });
  app.delete('/admin/webhook-subscriptions/:id', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const r = await pool!.query('delete from webhook_subscriptions where id=$1 and organization_id=$2', [id, req.auth!.organizationId]);
    if (!r.rowCount) return rep.code(404).send({ error: 'subscription_not_found' });
    return { ok: true };
  });
  app.post('/admin/webhook-subscriptions/:id/test', { preHandler: staff }, async (req, rep) => {
    const id = z.string().uuid().parse((req.params as { id: string }).id);
    const s = (await pool!.query('select * from webhook_subscriptions where id=$1 and organization_id=$2', [id, req.auth!.organizationId])).rows[0];
    if (!s) return rep.code(404).send({ error: 'subscription_not_found' });
    const content = '【测试】村居换届系统 webhook 通知配置成功';
    try {
      let resp;
      if (s.channel === 'plain') { resp = await fetch(s.url + encodeURIComponent(content), { method: 'GET', signal: AbortSignal.timeout(8000) }); }
      else {
        const payload = s.channel === 'feishu' ? { msg_type: 'text', content: { text: content } } : { msgtype: 'text', text: { content, mentioned_mobile_list: [] } };
        resp = await fetch(s.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
      }
      return { ok: resp.ok, status: resp.status };
    } catch { return rep.code(502).send({ error: 'webhook_unreachable' }); }
  });
}
