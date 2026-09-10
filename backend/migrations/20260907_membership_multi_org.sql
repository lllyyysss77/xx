-- 2026-09-07 放开"一人一归属地"限制，支持同一干部在多村/社区跨归属地兼任不同角色。
-- 将 memberships.user_id 列级 UNIQUE 迁移为 (user_id, organization_id) 复合唯一。
-- 幂等：约束名按若存在则删除；复合唯一若不存在则创建。

do $$
begin
  -- 删除旧列级唯一（自动命名 memberships_user_id_key）
  if exists (select 1 from pg_constraint where conname='memberships_user_id_key' and conrelid='memberships'::regclass) then
    alter table memberships drop constraint memberships_user_id_key;
  end if;
  -- 删除可能在旧版本里已存在的等义约束名
  if exists (select 1 from pg_constraint where conname='memberships_user_id_organization_id_key' and conrelid='memberships'::regclass) then
    alter table memberships drop constraint memberships_user_id_organization_id_key;
  end if;
end $$;

-- 复合唯一
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='memberships_user_id_organization_id_key' and conrelid='memberships'::regclass
  ) then
    alter table memberships add constraint memberships_user_id_organization_id_key unique (user_id, organization_id);
  end if;
end $$;