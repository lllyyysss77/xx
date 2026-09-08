# AGENTS.md — 村居换届系统后端（backend）

## 项目概览
村/居（村委会、居委会）换届选举的**政务内部管理系统后端**。村、社区两套 SOP 流程基本一致，仅选举细节与岗位有差异；以 **D 日（选举日）倒排** 驱动，一套 pipeline 复用，各村/社区仅数据内容不同。

- 形态：Fastify 5 + TypeScript（tsx 直跑）+ PostgreSQL（Neon）+ zod 校验。
- 前端：`web/`（**React 18 + Vite 5 + TDesign + axios** 管理后台，注意不是 Vue）；`miniprogram/`（参选人小程序）。
- **部署形态（2026-09-08 起）**：后端 Fastify 在生产环境**同源托管** `web/dist`（@fastify/static），单端口对外；
  前端 API baseURL 用**同源相对路径**（`web/src/api/client.ts` 的 `API_BASE_URL` 默认空串），
  本地 `vite dev` 经 `vite.config.js` 的 `server.proxy` 把 `/admin`、`/auth`、`/files`、`/health` 代理到后端。
  ——彻底消除「前端写死 `http://127.0.0.1:3100` + 跨域」导致部署后所有接口/上传失败的根因。
- 端口：从 `DEPLOY_RUN_PORT`（沙箱/部署）读取，回退 `PORT`、再回退 3100；监听 host 默认 `0.0.0.0`（可用 HOST 覆盖）。
- 数据库连接：`DATABASE_URL` 环境变量（`.env`，**禁止入库真实密钥到 git**）。
- `/`：web/dist 存在时返回后台首页（SPA history 路由由 setNotFoundHandler 回退 index.html，/admin//auth//files//health 不回退仍返回 JSON）；无 dist 时返回 API 服务信息 JSON。

## 常用命令（仅用 pnpm）
- 安装依赖：`pnpm install`
- 类型检查：`pnpm run check`（= `tsc --noEmit`）
- 构建：`pnpm run build`（输出 `dist/`）
- 开发：`pnpm run dev`
- 建库/对齐 schema（幂等）：`pnpm run migrate`（执行 `schema.sql`，全部 `create/alter ... if not exists`）
- 执行 migrations/ 增量迁移：`pnpm run migrate:file [文件名]`（不传参执行全部，带 `schema_migrations` 记录表）
- 按甲方 DOCX 重建公告模板：`pnpm run seed:templates`

## 目录结构
```
src/
  server.ts          仅组装：注册 helmet/cors/multipart + 各路由插件 + /health + 错误处理
  lib.ts             共享层：pool、auth/roleGuard/requirePerm、notify、日程(addDays/schedule)、saveUploadPart(统一落盘)
  migrate.ts         执行 schema.sql
  migrate-file.ts    执行 migrations/*.sql（带 schema_migrations 记录）
  routes/
    auth.ts          登录（管理端 / 参选人入口）、组织、注册、改密
    accounts.ts      超管秘密开号：选归属地→选角色→手机号+初始密码(123456)，后台不开放注册
    roles.ts         角色 / 权限点
    elections.ts     选举封地(fief)/日程实例/候选人口径/归档台账 /admin/archives
    proposals.ts     换届提案：创建/编辑/审批；通过→单事务建封地+日程+岗位+公告
    materials.ts     参选人报名材料 + 多附件
    candidates.ts    候选人池 + R1~R4 四轮审核（材料完整/镇级初审/区级联审/党委考察）
    announcements.ts 公告 + 模板 + 发布
    files.ts         统一上传 /files/upload、匿名下载 /files/:key
    biz-files.ts     提案/公告/岗位三类业务附件（各一张 *_files 强外键表）
    notifications.ts webhook 订阅（企微/飞书/plain）
migrations/          增量幂等 SQL
schema.sql           全量幂等建表 + 补列 alter（建库唯一依据）
seed-templates.mjs   按甲方 DOCX 重建公告模板（含 at_sched_offset 自动排期）
rebuild-db.mjs       仅本地/演练用：drop 全表重建 + seed（**严禁在生产执行**）
```

## 关键业务规则（字段/流程契约）
- **D 日倒排**：`stage_templates(st_day_offset, st_duration_days, org_type)`；实例 `election_fief_stages` 的
  `start = dDay + st_day_offset`，`end = dDay + st_day_offset + max(0, st_duration_days-1)`（村/居两种入口必须同公式）。
- **提案审批通过**（`proposals.ts`）单事务：建 `election_fiefs` → 回填 `election_proposals.created_fief_id` →
  生成日程 → 落 `positions`（含 `election_method/requirement`）→ 岗位样表附件落 `position_files` →
  按 `announcement_templates.at_sched_offset` 自动生成 `announcements`（`template_id/scheduled_for/stage_key`）。
- **驳回**：`election_proposals.status='rejected'` 并写 `reject_reason`。
- **归属地**：创建提案等写操作默认取当前登录 `req.auth.organizationId`，无需前端手填；超管可显式指定。
- **权限点**：`requirePerm('xxx')` 查 `role_permissions(role_key,permission)`。内部角色 `is_staff=true`。
  注意 `proposal:create` 为创建/编辑提案所需（迁移会给所有 staff 角色补发）。
- **附件统一收口**：所有上传走 `lib.saveUploadPart`，落 `uploads/{归属地}/{届|未分类}/{sourceType}/`，返回 storageKey 由业务表存 metadata。

## 2026-09-07 P0/P1 修复记录（版本混入治理）
起因：路由/前端 Notice/seed 是“新版倒排公告”，但 schema 停在旧版且无迁移，审批事务必 500 回滚。
- 补列（schema.sql + migrations/20260907_proposal_workbench_align.sql）：
  `announcements.scheduled_for/stage_key`、`announcement_templates.at_sched_offset`、
  `positions.election_method/requirement`、`election_proposals.reject_reason/created_fief_id`。
- 权限：`proposal:create` 并入 rebuild seed 与 ALL_PERMS/EDITOR_PERMS；迁移给存量 staff 角色补发。
- 日程公式：`elections.ts` 手动建活动与 `rebuild-db.mjs` seed 统一为 `offset + duration - 1`；
  且修正 seed 中把“结束偏移”误存进 `st_duration_days` 的符号/语义错误。
- 归档：`/admin/archives` 提案/提案附件的 `elId` 改用 `created_fief_id`（老数据按组织最新封地 lateral 兜底）。
- 社区文案：移除过宽的 `.replace(/党委/g,'党工委')`，仅“乡镇党委”→“街道党工委”。
- 创建提案：`organizationId` 可选并默认取登录归属地；term/unit 缺失自动兜底（无单位按组织名自建）。
- 新增 `POST /admin/proposals/sample-file`：提案阶段“新增岗位”样表附件上传（此时岗位/封地尚未建）。
- 端口：`lib.ts` 读 `DEPLOY_RUN_PORT`；`package.json` 的 `seed:templates` 指向真实的 `seed-templates.mjs`。

## 2026-09-08 文件上传链路修复（web ↔ api 同源化）
起因：web 前端 `API_BASE_URL` 写死 `http://127.0.0.1:3100` 且跨域直连，部署到公网后浏览器请求指向用户本机，
所有接口/上传/预览全挂；vite 未配 proxy；后端只监听 127.0.0.1。0 置信交叉审计后修复：
- **同源托管**：后端注册 `@fastify/static` 托管 `web/dist`（`prefix:'/'`、`wildcard:false`），
  `setNotFoundHandler` 对非 API 路径回退 `index.html`（SPA），`/admin`、`/auth`、`/files`、`/health`、`/ws` 仍返回 JSON 404。
- **监听地址**：`app.listen` host 由写死 `127.0.0.1` 改为 `0.0.0.0`（HOST 可覆盖），否则容器外不可达。
- **前端 baseURL**：`web/src/api/client.ts` 默认空串（同源相对路径），仅 `VITE_API_BASE_URL` 显式配置才跨域；
  `getFileUrl` 随之变同源 `/files/:key`。
- **vite 代理**：`web/vite.config.js` 新增 `server.proxy`（/admin /auth /files /health → 后端，target 读
  `VITE_API_PROXY_TARGET` 或 `DEPLOY_RUN_PORT/PORT/3100`），本地 dev 与生产行为一致。
- **上传 Content-Type**：移除 positions/announcements 手动设的 `'Content-Type':'multipart/form-data'`（缺 boundary），
  统一由 client 拦截器对 FormData 删除该头、浏览器自动带 boundary。
- **登录 500（sessions.id null）**：遗留库 `sessions` 主键 uuid 列**缺 `gen_random_uuid()` 默认值**
  （`create table if not exists` 不修旧表）。代码侧 `lib.login` insert 显式传 `randomUUID()`；
  并加幂等迁移 `migrations/20260908_fix_uuid_pk_defaults.sql`，给所有「单列 uuid 主键且无默认值」的列补 default。
- **错误处理**：zod 校验失败此前返回 500（tsx/跨包下 `instanceof z.ZodError` 不稳），改为鸭子类型识别 `issues` 数组→400；
  401/403/404/409 透传状态码。
- `.coze`：dev/deploy build 均追加 `(cd web && pnpm install && pnpm exec vite build --mode release)` 产出 dist。
- 契约核对（均一致，无需改）：上传返回 `{storageKey,fileName,mimeType,sizeBytes,relPath}`；
  storageKey=32hex+ext，下载 `/files/:key` 正则 `^[a-f0-9]{32}(\.{1,10})?$` 匹配；
  materials 两步走（/files/upload → POST /admin/materials/:id/file JSON）端点存在于 materials.ts；
  FileList 组件已遍历 files[] 全量（非只渲染 files[0]）。

## 待办 / 后续（未在本次完成）
- “外送抄送邮箱”真实邮件/外发通道尚未对接（`POST /admin/candidates/:id/send` 目前是 webhook 对接点，需接实际通道）。
- 小程序端 BASE_URL 仍写死 `127.0.0.1:3100`，需按小程序环境改配置（本次只修了 web + api）。
- `rebuild-db.mjs` 依赖 `db-backup/...` 文件且含硬编码演示数据，仅限演练；生产用 `pnpm run migrate` + `migrate:file`。
- web 打包有单 chunk >500kB 警告（tdesign 全量），可后续做按需引入/手动分包优化。

## 安全注意
- `.env` 含 DATABASE_URL，不提交真实值；日志禁止打印密钥/token/完整请求体。
- 所有业务表写操作按归属地 `orgScope` 校验，防跨村/社区串台。
