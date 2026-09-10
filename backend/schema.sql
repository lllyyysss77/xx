-- ============================================================
-- 村居换届选举系统 · 主链 schema（backend-new · 脱稿制权威定义）
-- 更新：2026-09-04 角色收敛五角色 + org_type + roles/role_permissions
-- 依据：取证目录《14_系统认知基线-脱稿制.md》§4/§5/§6
-- 注意：本文件为权威定义；实际建库/迁移走 rebuild-db.mjs
-- ============================================================
create extension if not exists pgcrypto;

-- 归属地（村/社区）
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  org_type text not null default 'village' check (org_type in ('village','community')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

-- 账号主体（手机号全局唯一，防串台）
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  password_hash text not null,
  display_name text,
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);

-- 归属关系：一人一归属地一角色（归属地天然绑死）
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  role text not null check (role in ('platform_admin','sub_admin','editor','reviewer','candidate')),
  created_at timestamptz not null default now()
);

-- 开账号（平台超管用）
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  phone text not null,
  role text not null check (role in ('sub_admin','editor','reviewer','candidate')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references users(id),
  accepted_at timestamptz
);

-- 登录态（7 天）
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 角色定义（可配置，超管可调整；is_system=内置角色禁删）
create table if not exists roles (
  key text primary key,
  name text not null,
  is_staff boolean not null default false,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

-- 角色 → 权限点（可配置，超管可在后台增删改）
create table if not exists role_permissions (
  role_key text not null references roles(key) on delete cascade,
  permission text not null,
  description text,
  primary key (role_key, permission)
);

-- 届次
create table if not exists election_terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_at timestamptz not null default now()
);

-- 单位（某归属地下的选举单位）
create table if not exists election_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

-- 封地（一次换届活动）
create table if not exists election_fiefs (
  id uuid primary key default gen_random_uuid(),
  election_term_id uuid not null references election_terms(id),
  organization_id uuid not null references organizations(id),
  unit_id uuid not null references election_units(id),
  name text not null,
  d_day date not null,
  timezone text not null default 'Asia/Shanghai' check (timezone = 'Asia/Shanghai'),
  status text not null default 'draft' check (status in ('draft','active','closed')),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
  -- 每村可建多个选举活动：不设 (term, org, unit) 唯一排他（2026-09-04 移除）
);

-- 日程模板（村/居两版，按 org_type 区分）
-- 【字段语义权威约定 · 严禁误解】
--   st_day_offset    = 阶段开始日相对于 D 日（正式选举日）的偏移天数（负=D 日前，正=D 日后，0=选举当日）
--   st_duration_days = ⚠️  不是「持续天数」！是「阶段结束日相对于 D 日的偏移量」！
--                      字段名有历史误导性，但已固化不可修改。调用方必须按偏移量理解。
--   正确计算公式：start_date = D日 + st_day_offset
--                 end_date   = D日 + st_duration_days
--   大月/小月/闰年/平年全部由上层 addDays() 函数（Date.prototype.setUTCDate）自动精准处理。
--   严禁业务层手写 if-else 月份天数表，以防引入分支计算漏洞。
-- 【范例 · 选民登记 D-33 ~ D-29】
--   st_day_offset = -33   → 开始日 = 2026-10-18 + (-33) = 2026-09-15
--   st_duration_days = -29 → 结束日 = 2026-10-18 + (-29) = 2026-09-19
--   实际持续天数 = 5 天（含首尾两天）
-- 【踩坑记录】
--   历史曾误将 st_duration_days 当持续天数使用，公式写成 start + max(0, duration - 1)，
--   导致 D 日前所有负偏移阶段被 max(0, 负数-1)=0 压缩成单日，违反法定公示期限。已修复。
create table if not exists stage_templates (
  id uuid primary key default gen_random_uuid(),
  st_key text not null,
  st_name text not null,
  st_day_offset integer not null,
  st_duration_days integer not null,
  st_order integer not null,
  st_description text,
  org_type text not null default 'village' check (org_type in ('village','community')),
  source_label text not null default 'government-procedure',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (st_key, org_type)
);

-- 实例化日程
create table if not exists election_fief_stages (
  id uuid primary key default gen_random_uuid(),
  election_fief_id uuid not null references election_fiefs(id) on delete cascade,
  stage_template_id uuid not null references stage_templates(id),
  stage_key text not null,
  stage_name text not null,
  start_date date not null,
  end_date date not null,
  stage_order integer not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed')),
  created_at timestamptz not null default now(),
  unique (election_fief_id, stage_key)
);
create index if not exists election_fief_stages_fief_idx on election_fief_stages(election_fief_id, stage_order);

-- 公告模板（18 套，甲方 DOCX 核对）
create table if not exists announcement_templates (
  id uuid primary key default gen_random_uuid(),
  at_code text not null,
  at_name text not null,
  at_version text not null default '通用',
  at_content text not null,
  at_need_remind boolean not null default false,
  at_note text,
  source_label text not null default 'government-document',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (at_code, at_version)
);
-- 补列（对齐 projects/schema.sql；消除未来重建丢列风险）：模板调度偏移，用于按 D 日倒排自动生成公告
alter table announcement_templates add column if not exists at_sched_offset integer;
create index if not exists announcement_templates_sched_idx on announcement_templates(at_sched_offset);

-- 材料（参选人提交）
create table if not exists materials (
  id uuid primary key default gen_random_uuid(), election_fief_id uuid not null references election_fiefs(id) on delete cascade,
  candidate_user_id uuid not null references users(id) on delete cascade, title text not null, description text,
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  submitted_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references users(id), review_note text
);
create index if not exists materials_fief_idx on materials(election_fief_id);
create index if not exists materials_candidate_idx on materials(candidate_user_id);

-- 材料附件（多附件硬约束）
create table if not exists material_files (
  id uuid primary key default gen_random_uuid(), material_id uuid not null references materials(id) on delete cascade,
  file_name text not null, mime_type text, size_bytes bigint, storage_key text, created_at timestamptz not null default now()
);
create index if not exists material_files_material_idx on material_files(material_id);

-- 选举提案（子管理发起，审批通过后 pipeline 生成封地/日程/岗位/公告）
create table if not exists election_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  term_id uuid not null references election_terms(id),
  unit_id uuid not null references election_units(id),
  name text not null, d_day date not null, org_type text not null,
  positions jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  proposed_by uuid not null references users(id), reviewed_by uuid references users(id), reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists election_proposals_org_idx on election_proposals(organization_id);
-- 补列（对齐 projects/schema.sql；消除未来重建丢列风险）：驳回原因 + 审批通过自动创建的封地 id
alter table election_proposals add column if not exists reject_reason text;
alter table election_proposals add column if not exists created_fief_id uuid references election_fiefs(id);
create index if not exists election_proposals_fief_idx on election_proposals(created_fief_id);

-- 岗位（pipeline 按封地生成，含报名/材料审核起止日期）
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  election_fief_id uuid not null references election_fiefs(id) on delete cascade,
  name text not null, quota integer not null default 1,
  application_start date not null, application_end date not null,
  material_review_start date not null, material_review_end date not null,
  status text not null default 'open', created_at timestamptz not null default now()
);
create index if not exists positions_fief_idx on positions(election_fief_id);
-- 补列（对齐 projects/schema.sql；消除未来重建丢列风险）：选举方式（默认全民直接选举）+ 岗位要求
alter table positions add column if not exists election_method text not null default '全民直接选举';
alter table positions add column if not exists requirement text;

-- 业务附件表：结构统一复刻 material_files，各封地强外键挂自己主表（统一落盘 /files/upload，各表存 metadata）
create table if not exists proposal_files (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references election_proposals(id) on delete cascade,
  file_name text not null, mime_type text, size_bytes bigint, storage_key text,
  created_by uuid references users(id), created_at timestamptz not null default now()
);
create index if not exists proposal_files_proposal_idx on proposal_files(proposal_id);

create table if not exists position_files (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  file_name text not null, mime_type text, size_bytes bigint, storage_key text,
  created_by uuid references users(id), created_at timestamptz not null default now()
);
create index if not exists position_files_position_idx on position_files(position_id);

-- 候选人（材料审核通过后进入）
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(), election_fief_id uuid not null references election_fiefs(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade, material_id uuid not null unique references materials(id),
  status text not null default 'reviewing' check (status in ('reviewing','approved','rejected')),
  current_round text not null default 'R1' check (current_round in ('R1','R2','R3','R4','complete')),
  created_at timestamptz not null default now(), unique(election_fief_id,user_id)
);
create table if not exists candidate_reviews (
  id uuid primary key default gen_random_uuid(), candidate_id uuid not null references candidates(id) on delete cascade,
  round text not null check (round in ('R1','R2','R3','R4')), reviewer_id uuid not null references users(id),
  decision text not null check (decision in ('approved','rejected')), note text, created_at timestamptz not null default now(), unique(candidate_id,round)
);
create index if not exists candidate_reviews_candidate_idx on candidate_reviews(candidate_id);

-- 公告
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(), election_fief_id uuid not null references election_fiefs(id) on delete cascade,
  title text not null, body text not null, status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid not null references users(id), updated_by uuid not null references users(id), published_by uuid references users(id), published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table announcements add column if not exists template_id uuid references announcement_templates(id);
-- P1 小编工作台编辑态列（2026-09-05；迁移 migrations/20260905_announcement_workbench_cols.sql）
alter table announcements add column if not exists ann_sign text;
alter table announcements add column if not exists ann_sign_date text;
alter table announcements add column if not exists ann_open_material_submit boolean not null default false;
alter table announcements add column if not exists ann_publish_mode text not null default 'immediate' check (ann_publish_mode in ('immediate','scheduled'));
alter table announcements add column if not exists ann_publish_at timestamptz;
alter table announcements add column if not exists ann_remind_hours int not null default 24;
alter table announcements add column if not exists ann_remind_to text not null default 'editor,admin';
create index if not exists announcements_fief_idx on announcements(election_fief_id);
create index if not exists announcements_template_idx on announcements(template_id);
-- 补列（对齐 projects/schema.sql；消除未来重建丢列风险）：定时发布日期 + 阶段 key（按 D 日倒排匹配阶段）
alter table announcements add column if not exists scheduled_for date;
alter table announcements add column if not exists stage_key text;
create index if not exists announcements_scheduled_idx on announcements(scheduled_for);

-- 公告附件（结构复刻 material_files，强外键挂 announcements）
create table if not exists announcement_files (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  file_name text not null, mime_type text, size_bytes bigint, storage_key text,
  created_by uuid references users(id), created_at timestamptz not null default now()
);
create index if not exists announcement_files_ann_idx on announcement_files(announcement_id);


-- webhook 通知订阅（企业微信/飞书机器人；甲方自填 URL 与姓名，+号新增）
create table if not exists webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('wecom','feishu','plain')),
  url text not null,
  mobile text,
  active boolean not null default true,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);
create index if not exists webhook_subscriptions_org_idx on webhook_subscriptions(organization_id);

-- 经办人防旷工履职留痕证据链（记录关键公文与业务操作事实）
create table if not exists operation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  election_fief_id uuid references election_fiefs(id) on delete set null,
  user_id uuid not null references users(id) on delete cascade,
  user_name text,
  phone text,
  role text not null,
  action_type text not null,
  action_title text not null,
  details jsonb default '{}'::jsonb,
  client_ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_org_created on operation_audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_logs_user_created on operation_audit_logs(user_id, created_at desc);
create index if not exists idx_audit_logs_action on operation_audit_logs(action_type);



