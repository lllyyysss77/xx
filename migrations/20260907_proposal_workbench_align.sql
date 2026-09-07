-- 2026-09-07 P0：对齐“新版提案审批/倒排公告”路由与既有生产库 schema
-- 背景：路由（src/routes/proposals.ts）是新版（D 日倒排、自动排期公告、岗位样表），
--      但生产库停在旧版缺列，审批事务一执行就因 column does not exist 回滚，
--      导致活动/日程/岗位/公告/归档全部不生成。本迁移幂等补列并补发缺失权限点。

-- 1) 公告倒排自动排期列
alter table announcements add column if not exists scheduled_for date;
alter table announcements add column if not exists stage_key text;
create index if not exists announcements_scheduled_idx on announcements(scheduled_for);

-- 2) 公告模板 D 日倒排偏移量
alter table announcement_templates add column if not exists at_sched_offset integer;
create index if not exists announcement_templates_sched_idx on announcement_templates(at_sched_offset);

-- 3) 岗位选举方式 / 任职条件
alter table positions add column if not exists election_method text not null default '全民直接选举';
alter table positions add column if not exists requirement text;

-- 4) 提案驳回原因
alter table election_proposals add column if not exists reject_reason text;
-- 提案审批通过时自动创建的封地 id（归档台账据此把提案挂到正确活动）
alter table election_proposals add column if not exists created_fief_id uuid references election_fiefs(id);
-- 回填存量数据：把已通过提案关联到本组织下 D 日最接近/最新的封地
update election_proposals p
set created_fief_id = (
  select f.id from election_fiefs f
  where f.organization_id = p.organization_id order by f.d_day desc nulls last, f.created_at desc limit 1
)
where p.status = 'approved' and p.created_fief_id is null;

-- 5) 补发缺失权限点 proposal:create（路由要求 proposal:create，但旧种子只授了 proposal:edit，
--    导致连超管创建/编辑提案都 403）。给所有内部角色补发；platform_admin/sub_admin 同权。
insert into role_permissions(role_key, permission, description)
select r.key, 'proposal:create', '创建/编辑换届提案'
from roles r
where r.is_staff = true
on conflict (role_key, permission) do nothing;
