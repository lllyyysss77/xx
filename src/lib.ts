/**
 * ── 后端共享层（lib）──
 * 全部路由模块的公共依赖：DB 池 / 认证 / 权限 / 通知 / 日程计算 / 附件常量
 * 说明：仅做逻辑搬运，不做行为变更；类型声明合并到 FastifyRequest
 */
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, createWriteStream, promises as fsp } from 'node:fs';
import { join } from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Pool, types } from 'pg';
import { z } from 'zod';
types.setTypeParser(1082, value => value);
declare module 'fastify'{interface FastifyRequest{auth?:{userId:string;organizationId:string;role:string}}}

export { z };
export const scrypt = promisify(scryptCallback);
export const port = Number(process.env.DEPLOY_RUN_PORT ?? process.env.PORT ?? 3100);
export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }) : null;
export const hash = (v: string) => createHash('sha256').update(v).digest('hex');

export async function passwordHash(p: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(p, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function passwordOk(p: string, s: string) {
  const [scheme, salt, hex] = s.split(':');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const key = await scrypt(p, salt, 64) as Buffer, expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

/** 登录态鉴权：session → user/org/role */
export async function auth(req: FastifyRequest, rep: FastifyReply) {
  if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return rep.code(401).send({ error: 'unauthorized' });
  const r = (await pool.query("select s.user_id,s.organization_id,m.role from sessions s join users u on u.id=s.user_id and u.status='active' join organizations o on o.id=s.organization_id and o.status='active' join memberships m on m.user_id=s.user_id and m.organization_id=s.organization_id where s.token_hash=$1 and s.expires_at>now()", [hash(token)])).rows[0];
  if (!r) return rep.code(401).send({ error: 'invalid_session' });
  req.auth = { userId: r.user_id, organizationId: r.organization_id, role: r.role };
}
export const roleGuard = (...roles: string[]) => async (req: FastifyRequest, rep: FastifyReply) => {
  await auth(req, rep); if (rep.sent) return;
  if (!roles.includes(req.auth!.role)) return rep.code(403).send({ error: 'forbidden' });
};
export const staff = roleGuard('platform_admin', 'sub_admin', 'editor', 'reviewer');
export const requirePerm = (...perms: string[]) => async (req: FastifyRequest, rep: FastifyReply) => {
  await auth(req, rep); if (rep.sent) return;
  const r = await pool!.query('select 1 from role_permissions where role_key=$1 and permission=any($2)', [req.auth!.role, perms]);
  if (!r.rowCount) return rep.code(403).send({ error: 'forbidden' });
};

/** webhook 通知：该 org 所有 active 订阅逐个推送；plain 走 GET 追加，wecom/feishu 走 POST JSON，失败静默 */
export const notify = async (orgId: string, content: string, mobile?: string, mentionedMobiles?: string[]) => {
  try {
    const subs = (await pool!.query('select * from webhook_subscriptions where organization_id=$1 and active=true', [orgId])).rows;
    await Promise.allSettled(subs.map(async (s: any) => {
      if (s.channel === 'plain') { await fetch(s.url + encodeURIComponent(content), { method: 'GET', signal: AbortSignal.timeout(5000) }); return; }
      const payload = s.channel === 'feishu'
        ? { msg_type: 'text', content: { text: content } }
        : { msgtype: 'text', text: { content, mentioned_mobile_list: mentionedMobiles?.length ? mentionedMobiles : [...(mobile ? [mobile] : [])] } };
      await fetch(s.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(5000) });
    }));
  } catch { /* 静默 */ }
};

export const shanghaiDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const addDays = (date: string, n: number) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const schedule = (date: string) => ({ d_minus_30: addDays(date, -30), d_minus_7: addDays(date, -7), d_day: date, d_plus_1: addDays(date, 1), d_plus_7: addDays(date, 7) });
export const orgScope = (organizationId: string, req: FastifyRequest) => req.auth!.role === 'platform_admin' || req.auth!.organizationId === organizationId;

/** 登录共用（admin / candidate 入口）；返回 token + 归属地信息（orgName/orgType/slug） */
export const login = async (req: FastifyRequest, rep: FastifyReply, allowedRoles: string[]) => {
  const b = z.object({ phone: z.string(), password: z.string(), organizationId: z.string().uuid() }).parse(req.body);
  if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
  const u = (await pool.query("select u.id,u.password_hash,u.display_name,m.role,o.name as org_name,o.org_type,o.slug as org_slug from users u join memberships m on m.user_id=u.id and m.organization_id=$2 join organizations o on o.id=m.organization_id and o.status='active' where u.phone=$1 and u.status='active'", [b.phone, b.organizationId])).rows[0];
  if (!u || !allowedRoles.includes(u.role) || !(await passwordOk(b.password, u.password_hash))) return rep.code(401).send({ error: 'invalid_credentials_or_entrypoint' });
  const token = randomBytes(32).toString('base64url');
  const s = (await pool.query("insert into sessions(user_id,organization_id,token_hash,expires_at) values($1,$2,$3,now()+interval '7 days') returning expires_at", [u.id, b.organizationId, hash(token)])).rows[0];
  // 登录即带回该角色在 role_permissions 中绑定的全部权限点，避免前端再用高权限接口二次拉取
  const permissions = (await pool.query('select permission from role_permissions where role_key=$1', [u.role])).rows.map((r: { permission: string }) => r.permission);
  return { token, expiresAt: s.expires_at, organizationId: b.organizationId, role: u.role, orgName: u.org_name, orgType: u.org_type, slug: u.org_slug, displayName: u.display_name, permissions };
};

/** 封地归属校验：查活动所属 org 并核对 scope */
export const fiefFor = async (id: string, req: FastifyRequest, rep: FastifyReply) => {
  const f = (await pool!.query('select id,organization_id from election_fiefs where id=$1', [id])).rows[0];
  if (!f) return rep.code(404).send({ error: 'election_fief_not_found' });
  if (!orgScope(f.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
  return f;
};

/** ── 附件统一出入口常量（磁盘存 backend-new/uploads，DB 存 metadata）── */
export const UPLOAD_DIR = (() => { const d = join(process.cwd(), 'uploads'); mkdirSync(d, { recursive: true }); return d; })();
export const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8',
};

/** 目录名净化：只留中文/字母/数字/中划线，防路径穿越 */
function sanitizeDir(s: string): string {
  return s.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || '未命名';
}

/**
 * 统一附件落盘（/files/upload 与各业务附件路由共用，唯一收口，禁止各处复制落盘逻辑）
 * 物理路径 uploads/{归属地}/{届|未分类}/{sourceType}/{32hex+ext}
 * 入参 part 为 @fastify/multipart 的 req.file()；返回文件元数据，由调用方写入各自业务的 *_files 表
 */
export async function saveUploadPart(
  part: { filename: string; mimetype: string; file: NodeJS.ReadableStream },
  opts: { orgId: string; fiefId?: string | null; sourceType?: string },
): Promise<{ storageKey: string; fileName: string; mimeType: string; sizeBytes: number; relPath: string }> {
  const ext = (part.filename.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] || '').toLowerCase();
  const storageKey = randomBytes(16).toString('hex') + ext;
  const orgRow = (await pool!.query('select name from organizations where id=$1', [opts.orgId])).rows[0];
  const orgName = orgRow?.name || '未知归属地';
  let termName: string | null = null;
  if (opts.fiefId && /^[0-9a-f-]{36}$/i.test(opts.fiefId)) {
    const t = (await pool!.query('select t.name from election_fiefs f join election_terms t on t.id=f.election_term_id where f.id=$1', [opts.fiefId])).rows[0];
    termName = t?.name || null;
  }
  const sourceType = (opts.sourceType || 'other').match(/^[a-z_]{1,30}$/)?.[0] || 'other';
  const relPath = join(sanitizeDir(orgName), sanitizeDir(termName || '未分类'), sourceType);
  await fsp.mkdir(join(UPLOAD_DIR, relPath), { recursive: true });
  const sizeBytes = await new Promise<number>((resolve, reject) => {
    let n = 0;
    const ws = createWriteStream(join(UPLOAD_DIR, relPath, storageKey));
    ws.on('error', reject);
    part.file.on('error', reject);
    part.file.on('data', (c: Buffer) => { n += c.length; });
    part.file.pipe(ws).on('finish', () => resolve(n));
  });
  return { storageKey, fileName: part.filename, mimeType: part.mimetype || 'application/octet-stream', sizeBytes, relPath };
}
