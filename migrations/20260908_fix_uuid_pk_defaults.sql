-- 20260908_fix_uuid_pk_defaults.sql
-- 背景：被破坏的遗留库中部分表（如 sessions）主键 uuid 列缺少 gen_random_uuid() 默认值，
-- 而 schema.sql 使用 create table if not exists，不会修正已存在的旧表，
-- 导致 insert 不显式给 id 时触发 "null value in column id violates not-null constraint"（登录直接 500）。
-- 本迁移幂等地为所有「uuid 主键且无默认值」的列补上 default gen_random_uuid()，确保 pgcrypto 已启用。

create extension if not exists pgcrypto;

do $$
declare r record;
begin
  for r in
    select n.nspname::text as schema_name,
           c.relname::text as table_name,
           a.attname::text as col_name
    from pg_constraint con
    join pg_class c      on c.oid = con.conrelid
    join pg_namespace n  on n.oid = c.relnamespace
    join pg_attribute a  on a.attrelid = c.oid and a.attnum = any(con.conkey)
    join pg_type t       on t.oid = a.atttypid
    where con.contype = 'p'
      and n.nspname = 'public'
      and t.typname = 'uuid'
      and a.attnum = 1                 -- 仅处理单列主键（本项目全部为单列 uuid 主键）
      and not exists (
        select 1 from pg_attrdef d
        where d.adrelid = c.oid and d.adnum = a.attnum
      )
  loop
    execute format(
      'alter table %I.%I alter column %I set default gen_random_uuid()',
      r.schema_name, r.table_name, r.col_name
    );
    raise notice 'set default gen_random_uuid() on %.%', r.table_name, r.col_name;
  end loop;
end$$;
