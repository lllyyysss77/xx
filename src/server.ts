/**
 * ── 后端入口（只做组装，不写业务）──
 * 业务路由按封地拆在 src/routes/*.ts，共享依赖在 src/lib.ts
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z, pool, port } from './lib';
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

const app = Fastify({ logger: true });

// 全局中间件与能力（对所有子插件可见）
await app.register(helmet);
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

// ── Web 后台同源托管 ──
// 生产构建后 web/dist 存在：由本服务单端口同源托管前端，彻底消除跨域/端口硬编码/127.0.0.1 问题。
// 本地纯 API 开发（无 dist）时退化为根路径 JSON 指路，不影响接口调试。
const WEB_DIST = resolve(process.cwd(), 'web/dist');
const WEB_BUILT = existsSync(join(WEB_DIST, 'index.html'));
const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:3003';

if (WEB_BUILT) {
  // wildcard: false → 仅托管真实静态资源；SPA 路由回退由下方 setNotFoundHandler 处理
  await app.register(fastifyStatic, {
    root: WEB_DIST,
    prefix: '/',
    wildcard: false,
    index: ['index.html'],
  });
} else {
  app.get('/', async (_req, rep) => {
    return rep.type('application/json').send({
      service: 'cxq-new-backend', ok: true, db: pool ? 'configured' : 'not_configured',
      web: WEB_URL, health: '/health',
      message: '这是 API 服务（未检测到 web/dist 构建产物）。Web 后台开发地址 ' + WEB_URL,
    });
  });
}

// 健康检查
app.get('/health', async () => {
  let db: 'up' | 'not_configured' | 'down' = 'not_configured';
  if (pool) try { await pool.query('select 1'); db = 'up'; } catch { db = 'down'; }
  return { ok: db !== 'down', service: 'cxq-new-backend', db };
});

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

// SPA history 路由回退：浏览器刷新 /proposals 等前端路由时返回 index.html；
// API/文件/健康检查路径的 404 仍返回 JSON，不吞掉接口错误。
if (WEB_BUILT) {
  app.setNotFoundHandler((req, rep) => {
    const url = req.url.split('?')[0] || '/';
    const isApi = url.startsWith('/admin') || url.startsWith('/auth') ||
      url.startsWith('/files') || url.startsWith('/health') || url.startsWith('/ws');
    if (isApi) return rep.code(404).send({ error: 'not_found' });
    return rep.sendFile('index.html');
  });
}

// 统一错误处理
app.setErrorHandler((error, req, rep) => {
  // zod 校验失败：用鸭子类型识别（tsx/跨包下 instanceof 可能失效），稳定返回 400 而非 500
  const issues = (error as { issues?: unknown }).issues;
  if (Array.isArray(issues)) return rep.code(400).send({ error: 'invalid_request', issues });
  const sc = (error as { statusCode?: number }).statusCode;
  if (sc === 400) return rep.code(400).send({ error: 'invalid_request' });
  if (sc === 401 || sc === 403 || sc === 404 || sc === 409) {
    return rep.code(sc).send({ error: (error as { message?: string }).message || 'error' });
  }
  req.log.error(error);
  return rep.code(500).send({ error: 'internal_error' });
});

app.addHook('onClose', async () => { await pool?.end(); });

import { createServer } from 'node:net';

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

// 监听地址：容器/沙箱部署必须绑 0.0.0.0 才能被外部端口映射访问；本地可用 HOST 覆盖。
const HOST = process.env.HOST || '0.0.0.0';
await app.listen({ host: HOST, port: activePort });
console.log(`[server] listening on http://${HOST}:${activePort} (web dist: ${WEB_BUILT ? 'served' : 'absent, api-only'})`);
