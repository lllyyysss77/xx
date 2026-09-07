/**
 * ── 后端入口（只做组装，不写业务）──
 * 业务路由按封地拆在 src/routes/*.ts，共享依赖在 src/lib.ts
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
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

// 根路径指路：3100 是纯 API 服务，没有页面。浏览器误访问时引导到 web 后台，
// 避免看到 Fastify 的 404 JSON 就误判「服务挂了」；脚本访问则返回服务信息。
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

// 统一错误处理
app.setErrorHandler((error, req, rep) => {
  if (error instanceof z.ZodError) return rep.code(400).send({ error: 'invalid_request', issues: error.issues });
  if ((error as { statusCode?: number }).statusCode === 400) return rep.code(400).send({ error: 'invalid_request' });
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

await app.listen({ host: '127.0.0.1', port: activePort });
