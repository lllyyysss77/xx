/**
 * ── 后端入口（只做组装，不写业务）──
 * 业务路由按封地拆在 src/routes/*.ts，共享依赖在 src/lib.ts
 */
// ============================================================
// [TAG-INDEX] server.ts — 后端入口与路由注册中枢
// [ROUTE-CORE] L80-92  业务路由注册中枢（13 个路由模块挂载点）
// [ROUTE-CORE] L70-78  健康检查 /health（小程序在线模式时钟源）
// [BREAKPOINT] L94-108 全局错误兜底（Zod→400，其余→500，不外泄 PG 原文）
// [BREAKPOINT] L114-137 端口冲突自动切换（3100 被占时平滑找下一个）
// [ENV-CONFIG]   L25-55  CORS 白名单 / helmet / multipart 限制
// [ENV-CONFIG]   L139    HOST 监听地址
// ============================================================
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { z, pool, port, shanghaiDay } from './lib';
import { authRoutes } from './routes/auth';
import { fileRoutes } from './routes/files';
import { accountsRoutes } from './routes/accounts';
import { rolesRoutes } from './routes/roles';
import { notificationsRoutes } from './routes/notifications';
import { electionsRoutes } from './routes/elections';
import { proposalsRoutes } from './routes/proposals';
import { materialsRoutes } from './routes/materials';
import { candidatesRoutes } from './routes/candidates';
import { announcementsRoutes } from './routes/announcements';
import { bizFileRoutes } from './routes/biz-files';
import { auditLogsRoutes } from './routes/audit-logs';

const app = Fastify({ logger: true });

// [ENV-CONFIG] CORS 跨域白名单（ALLOWED_ORIGINS 环境变量，支持 * 通配）
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3003,http://127.0.0.1:3003,https://*.vercel.app')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.some((rule) => {
    if (rule === origin) return true;
    if (!rule.includes('*')) return false;
    const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i').test(origin);
  });
};

// 全局中间件与能力（对所有子插件可见）
await app.register(helmet);
await app.register(cors, {
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

// ── 同源托管 web/dist（沙箱/单端口部署形态）──
// backend 进程 cwd=backend，web 产物在 ../web/dist。
// 有 dist：@fastify/static 接管 / 与静态文件，未命中 API 前缀的 GET 回退 index.html（SPA history 路由）。
// 无 dist：保留纯 API 形态，/ 引导到 WEB_URL（本地 Nginx/独立前端部署）。
const WEB_DIST = path.resolve(process.cwd(), '..', 'web', 'dist');
const hasWebDist = fs.existsSync(path.join(WEB_DIST, 'index.html'));

// API 前缀：这些路径永不回退 index.html，404 一律返回 JSON，避免接口错误被 SPA 页面掩盖
const API_PREFIXES = ['/admin', '/auth', '/files', '/health', '/candidate', '/ws'];

if (hasWebDist) {
  await app.register(fastifyStatic, { root: WEB_DIST, prefix: '/', wildcard: false });
  console.log(`[web] serving frontend dist: ${WEB_DIST}`);
  app.setNotFoundHandler((req, rep) => {
    const url = req.raw.url || '/';
    const isApi = API_PREFIXES.some((p) => url === p || url.startsWith(p + '/') || url.startsWith(p + '?'));
    if (isApi) return rep.code(404).send({ error: 'not_found' });
    if (req.method === 'GET') return rep.sendFile('index.html');
    return rep.code(404).send({ error: 'not_found' });
  });
} else {
  console.log('[web] no web/dist found — pure API mode');
  const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:3003';
  app.get('/', async (req, rep) => {
    const wantHtml = String(req.headers.accept || '').includes('text/html');
    if (wantHtml) return rep.redirect(WEB_URL, 302);
    return {
      service: 'cxq-new-backend', ok: true, db: pool ? 'configured' : 'not_configured',
      web: WEB_URL, health: '/health',
      message: '这是 API 服务（无页面）。Web 后台在 ' + WEB_URL,
    };
  });
  app.setNotFoundHandler((req, rep) => {
    rep.code(404).send({ error: 'not_found', message: 'API 路径不存在' });
  });
}

// [ROUTE-CORE] 健康检查端点 /health — 小程序在线模式唯一时钟源（today 字段）
// today 为服务端「今天」（Asia/Shanghai），是小程序在线模式的唯一时钟源：
// miniprogram/data/http.js 读 health.today 覆盖 globalData.snapshotDate，
// 缺了它小程序会一直用 data/db.js 里硬编码的演示快照日 2026-07-21 去算倒计时与材料窗口。
app.get('/health', async () => {
  let db: 'up' | 'not_configured' | 'down' = 'not_configured';
  if (pool) try { await pool.query('select 1'); db = 'up'; } catch { db = 'down'; }
  return { ok: db !== 'down', service: 'cxq-new-backend', db, today: shanghaiDay() };
});

// [ROUTE-CORE] 业务路由注册中枢 — 全部 13 个 API 模块挂载点（后期追查路由从此处入手）
// 业务插件模块（按封地注册）
await app.register(authRoutes);        // 认证：登录/组织/注册/改密
await app.register(fileRoutes);        // 附件：上传/下载
await app.register(accountsRoutes);    // 账号：邀请/直建/归属地
await app.register(rolesRoutes);       // 角色：角色/权限点
await app.register(notificationsRoutes); // 通知：webhook 订阅
await app.register(electionsRoutes);   // 活动：封地/日程/候选人口径
await app.register(proposalsRoutes);   // 提案：提案/岗位/审批联动
await app.register(materialsRoutes);   // 材料：报名材料/附件/审核
await app.register(candidatesRoutes);  // 候选人：池/轮次审核
await app.register(announcementsRoutes); // 公告：公告/模板/发布
await app.register(bizFileRoutes);       // 业务附件：提案/公告/岗位各自强外键附件表
await app.register(auditLogsRoutes);     // 经办人防旷工履职留痕证据链与在岗统计

// [BREAKPOINT] 全局错误兜底 — Zod 校验失败→400，其余→500，PG 原文只进日志不外泄
// 统一错误处理：任何未捕获异常都要打出 method+URL+堆栈，避免间歇性裸 500 事后无法定位
app.setErrorHandler((error, req, rep) => {
  if (error instanceof z.ZodError || (error as any)?.name === 'ZodError') {
    return rep.code(400).send({ error: 'invalid_request', issues: (error as z.ZodError).issues });
  }
  if ((error as { statusCode?: number }).statusCode === 400) return rep.code(400).send({ error: 'invalid_request' });
  // 完整错误（含 message 与堆栈）只进日志，不外泄给前端
  console.error('[api-error]', req.method, req.url, error);
  req.log.error(error);
  const statusCode = (error as { statusCode?: number }).statusCode ?? 0;
  // 响应体不回传 err.message：web/src/api/client.ts 取提示文案时 message 优先于 error，
  // 会把 PG 原文（relation "x" does not exist / duplicate key / ECONNREFUSED 等）直接弹给用户，
  // 既难看又泄漏内部信息。定位靠上面的 console.error，不靠响应体。
  return rep.code(statusCode >= 400 ? statusCode : 500).send({ error: 'internal_error' });
});

app.addHook('onClose', async () => { await pool?.end(); });

import { createServer } from 'node:net';

// [BREAKPOINT] 端口占用检测与自动切换 — 运维断点（3100 被占时自动找下一个可用端口）
/** 检测端口是否已被其他进程占用 */
function isPortAvailable(checkPort: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(checkPort, '127.0.0.1');
  });
}

/** 端口占用自动寻找下一个可用端口（防端口冲突） */
async function resolveAvailablePort(startPort: number, maxTries = 30): Promise<number> {
  for (let p = startPort; p < startPort + maxTries; p++) {
    if (await isPortAvailable(p)) return p;
  }
  return startPort;
}

const activePort = await resolveAvailablePort(port);
if (activePort !== port) {
  console.log(`[Port Switch] 默认端口 ${port} 被占用，后端已自动平滑切换至新端口: ${activePort}`);
}

// [ROUTE-CORE] 服务启动监听 — HOST/PORT 均来自环境变量，无硬编码
const listenHost = process.env.HOST || '0.0.0.0';
await app.listen({ host: listenHost, port: activePort });

