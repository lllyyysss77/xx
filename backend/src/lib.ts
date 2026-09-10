/**
 * ── 后端共享层（lib）──
 * 全部路由模块的公共依赖：DB 池 / 认证 / 权限 / 通知 / 日程计算 / 附件常量
 * 说明：仅做逻辑搬运，不做行为变更；类型声明合并到 FastifyRequest
 */
// ============================================================
// [TAG-INDEX] lib.ts — 后端共享层（全部路由的公共依赖）
// [DATA-LAYER]  L22-34   PostgreSQL 连接池（全部 DB 操作唯一入口）
// [DATA-LAYER]  L193-237 附件统一落盘唯一收口（saveUploadPart）
// [AUTH]        L49-57    登录态鉴权（session→user/org/role）
// [AUTH]        L58-69    角色守卫 + 权限点守卫（platform_admin 通配 *）
// [AUTH]        L142-153  登录共用入口（admin/candidate 双入口）
// [CORE-FLOW]   L71-83    webhook 通知推送（业务事件外呼通道）
// [CORE-FLOW]   L90-139   经办人防旷工履职留痕（operation_audit_logs）
// [CORE-FLOW]   L155-183  统一分页解析（双契约兼容，上限 200）
// [CORE-FLOW]   L185-191  封地归属校验（活动级 org 隔离闸）
// [ENV-CONFIG]  L18       服务端口（DEPLOY_RUN_PORT > PORT > 3100）
// ============================================================
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { setDefaultResultOrder } from 'node:dns';
import { promisify } from 'node:util';
import { mkdirSync, createWriteStream, promises as fsp } from 'node:fs';
import { join } from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Pool, types } from 'pg';
import { z } from 'zod';
types.setTypeParser(1082, value => value);
declare module 'fastify'{interface FastifyRequest{auth?:{userId:string;organizationId:string;role:string}}}

// Zeabur 等平台数据库变量自适应：平台注入的是 POSTGRES_* 系列离散变量，
// 而本服务统一读 DATABASE_URL。缺了这层，平台建库后服务仍报 database_not_configured。
function resolveDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.POSTGRES_HOST || process.env.PGHOST;
  const user = process.env.POSTGRES_USER || process.env.PGUSER;
  const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
  const database = process.env.POSTGRES_DB || process.env.PGDATABASE;
  if (!host || !user || !database) return undefined;
  const port = process.env.POSTGRES_PORT || process.env.PGPORT || '5432';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password || '')}@${host}:${port}/${database}`;
}
if (!process.env.DATABASE_URL) {
  const derived = resolveDatabaseUrl();
  if (derived) process.env.DATABASE_URL = derived;
}

// CloudRun 当前没有 IPv6 出网；Supabase 域名双栈解析时优先 IPv6 会导致连接直接 ENETUNREACH。
// 仅调整 DNS 结果顺序，不改变连接串、认证或数据库业务契约。
setDefaultResultOrder('ipv4first');

export { z };
export const scrypt = promisify(scryptCallback);
// [ENV-CONFIG] 服务端口（DEPLOY_RUN_PORT > PORT > 3100，无硬编码）
export const port = Number(process.env.DEPLOY_RUN_PORT ?? process.env.PORT ?? 3100);
// 连接池加固：Supabase 会重置空闲连接（ECONNRESET / 57P01），无 keepAlive 时
// 空闲客户端被 reset 后错误会抛给下一个借用它的 query，导致间歇性裸 500。
// max 保持 5，避免打爆云端连接数；pool.on('error') 防止空闲错误变成未捕获异常。
// [DATA-LAYER] PostgreSQL 连接池 — 全部 DB 操作的唯一入口（Supabase 空闲连接 keepAlive 加固）
export const pool: Pool | null = (() => {
  if (!process.env.DATABASE_URL) return null;
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
  p.on('error', (e: Error) => console.error('[pg-pool]', e?.message));
  return p;
})();
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

// [AUTH] 登录态鉴权 — session token → user/org/role，全部受保护路由的统一入口
/** 登录态鉴权：session → user/org/role */
export async function auth(req: FastifyRequest, rep: FastifyReply) {
  if (!pool) return rep.code(503).send({ error: 'database_not_configured' });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return rep.code(401).send({ error: 'unauthorized' });
  const r = (await pool.query("select s.user_id,s.organization_id,m.role from sessions s join users u on u.id=s.user_id and u.status='active' join organizations o on o.id=s.organization_id and o.status='active' join memberships m on m.user_id=s.user_id and m.organization_id=s.organization_id where s.token_hash=$1 and s.expires_at>now()", [hash(token)])).rows[0];
  if (!r) return rep.code(401).send({ error: 'invalid_session' });
  req.auth = { userId: r.user_id, organizationId: r.organization_id, role: r.role };
}
// [AUTH] 角色守卫 + 权限点守卫 — platform_admin 通配 *，其余按 role_permissions 表校验
export const roleGuard = (...roles: string[]) => async (req: FastifyRequest, rep: FastifyReply) => {
  await auth(req, rep); if (rep.sent) return;
  if (!roles.includes(req.auth!.role)) return rep.code(403).send({ error: 'forbidden' });
};
export const staff = roleGuard('platform_admin', 'sub_admin', 'editor', 'reviewer');
export const requirePerm = (...perms: string[]) => async (req: FastifyRequest, rep: FastifyReply) => {
  await auth(req, rep); if (rep.sent) return;
  // 平台超管拥有通配符 * 权限，天生统揽所有封地，直接放行
  if (req.auth!.role === 'platform_admin') return;
  const r = await pool!.query('select 1 from role_permissions where role_key=$1 and (permission=any($2) or permission=\'*\')', [req.auth!.role, perms]);
  if (!r.rowCount) return rep.code(403).send({ error: 'forbidden' });
};

// [CORE-FLOW] webhook 通知推送 — 公告发布/材料审核等业务事件的外呼通道（失败静默不阻塞主流程）
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

/**
 * 经办人防旷工履职留痕证据链埋点
 * 记录经办人在关键公文与业务流程中的真实在岗操作（发布公告、修改草稿、上传材料附件等）
 */
// [CORE-FLOW] 经办人防旷工履职留痕 — operation_audit_logs 表，关键操作的证据链埋点（发布/修改/上传等）
export async function logDutyAction(opts: {
  userId: string;
  organizationId?: string | null;
  electionFiefId?: string | null;
  actionType: string;
  actionTitle: string;
  details?: Record<string, any>;
  clientIp?: string | null;
}) {
  if (!pool) return;
  try {
    const userRow = (await pool.query(
      `select u.display_name, u.phone, m.role
       from users u
       left join memberships m on m.user_id = u.id and ($2::uuid is null or m.organization_id = $2)
       where u.id = $1
       limit 1`,
      [opts.userId, opts.organizationId ?? null]
    )).rows[0];

    const userName = userRow?.display_name || '经办人';
    const phone = userRow?.phone || '';
    const role = userRow?.role || 'staff';

    await pool.query(
      `insert into operation_audit_logs(
        organization_id, election_fief_id, user_id, user_name, phone,
        role, action_type, action_title, details, client_ip, created_at
      ) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [
        opts.organizationId ?? null,
        opts.electionFiefId ?? null,
        opts.userId,
        userName,
        phone,
        role,
        opts.actionType,
        opts.actionTitle,
        JSON.stringify(opts.details || {}),
        opts.clientIp ?? null
      ]
    );
  } catch (err) {
    console.error('[audit-log-error]', err);
  }
}


/** 登录共用（admin / candidate 入口）；返回 token + 归属地信息（orgName/orgType/slug） */
// [AUTH] 登录共用入口 — admin/candidate 双入口，返回 token + 权限点列表（前端无需二次拉取）
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

/**
 * 统一分页参数解析：兼容 page/pageSize 与 limit/offset 两套契约。
 * - limit/offset 优先：直接用作 SQL 的 LIMIT/OFFSET；
 * - 否则用 page(默认1)/pageSize(默认10) 推算 offset=(page-1)*pageSize；
 * - pageSize/limit 上限 200，防超大拉取拖垮云端库。
 * paginated=true 表示前端显式传入了任一分页参数，调用方应回信封 { items, total, page, pageSize }；
 * 否则保持返回原始数组，平滑兼容现有 web 列表（web/src/api/*.ts 用 Array.isArray 兜底）。
 */
// [CORE-FLOW] 统一分页解析 — 兼容 page/pageSize 与 limit/offset 双契约，上限 200 防拖库
export function parsePagination(query: any) {
  const rawPage = query?.page !== undefined ? Number(query.page) : undefined;
  const rawPageSize = query?.pageSize !== undefined ? Number(query.pageSize) : undefined;
  const rawLimit = query?.limit !== undefined ? Number(query.limit) : undefined;
  const rawOffset = query?.offset !== undefined ? Number(query.offset) : undefined;
  const paginated = rawPage !== undefined || rawPageSize !== undefined || rawLimit !== undefined || rawOffset !== undefined;
  const DEFAULT_PAGE = 1, DEFAULT_SIZE = 10, MAX_SIZE = 200;
  let page = DEFAULT_PAGE, pageSize = DEFAULT_SIZE, limit = DEFAULT_SIZE, offset = 0;
  if (rawLimit !== undefined && Number.isFinite(rawLimit)) {
    limit = Math.max(1, Math.min(MAX_SIZE, Math.floor(rawLimit)));
    offset = rawOffset !== undefined && Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
    page = Math.floor(offset / limit) + 1;
    pageSize = limit;
  } else {
    if (rawPage !== undefined && Number.isFinite(rawPage) && rawPage >= 1) page = Math.floor(rawPage);
    if (rawPageSize !== undefined && Number.isFinite(rawPageSize)) pageSize = Math.max(1, Math.min(MAX_SIZE, Math.floor(rawPageSize)));
    limit = pageSize;
    offset = (page - 1) * pageSize;
  }
  return { page, pageSize, limit, offset, paginated };
}

/** 封地归属校验：查活动所属 org 并核对 scope */
// [CORE-FLOW] 封地归属校验 — 活动级操作的 org 隔离闸（404/403 统一收口，防跨组织越权）
export const fiefFor = async (id: string, req: FastifyRequest, rep: FastifyReply) => {
  const f = (await pool!.query('select id,organization_id from election_fiefs where id=$1', [id])).rows[0];
  if (!f) return rep.code(404).send({ error: 'election_fief_not_found' });
  if (!orgScope(f.organization_id, req)) return rep.code(403).send({ error: 'organization_mismatch' });
  return f;
};

/** ── 附件统一出入口常量（磁盘存 backend-new/uploads，DB 存 metadata）── */
export const UPLOAD_DIR = ((): string => {
  // veFaaS 容器可能对 workdir 不可写（mkdirSync ENOENT），按序回退：
  // UPLOAD_DIR 环境变量 → cwd/uploads → /tmp/uploads（生产唯一可写目录）
  const candidates = [
    process.env.UPLOAD_DIR,
    join(process.cwd(), 'uploads'),
    '/tmp/uploads',
  ].filter(Boolean) as string[];
  for (const d of candidates) {
    try { mkdirSync(d, { recursive: true }); return d; } catch { /* 尝试下一个候选目录 */ }
  }
  // 全部失败也不阻塞启动：返回默认路径，写失败由请求层兜底报错
  return join(process.cwd(), 'uploads');
})();
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
// [DATA-LAYER] 统一附件落盘唯一收口 — /files/upload 与所有业务附件共用，物理路径 uploads/{org}/{term}/{type}/{32hex}
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
