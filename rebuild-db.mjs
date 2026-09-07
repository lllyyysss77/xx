// 重建 neondb：drop 全部 public 表 → 执行 schema.sql → 填充模板/角色/演示 seed
// 依据：取证目录《14_系统认知基线-脱稿制.md》§3/§4/§5/§6/§8/§9
import { Pool, types } from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
types.setTypeParser(1082, (v) => v);
const __dirname = dirname(fileURLToPath(import.meta.url));
const url = readFileSync(join(__dirname, '.env'), 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!url) throw new Error('no DATABASE_URL');
const pool = new Pool({ connectionString: url, max: 2 });

async function passwordHash(p) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(p, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
const addDays = (date, n) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// ---- 1. drop 全部 public 表 ----
const tabs = (await pool.query("select tablename from pg_catalog.pg_tables where schemaname='public'")).rows;
for (const t of tabs) await pool.query(`drop table if exists public."${t.tablename}" cascade`);
console.log('已清空 public schema：', tabs.length, '张表');

// ---- 2. 执行 schema.sql ----
await pool.query(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));
console.log('schema.sql 已执行');

// ---- 3. stage_templates 村/居两版（甲方 DOCX 校准）----
const VILLAGE = [
  ['prep','前期筹备',-35,1,1],
  ['elect_committee','成立选委会',-34,1,2],
  ['voter_reg','选民登记',-33,4,3],
  ['voter_list','公示选民名单',-20,1,4],
  ['voter_appeal','受理选民申诉',-19,4,5],
  ['nominate_start','候选人提名启动',-15,1,6],
  ['nominate_cont','候选人提名延续',-14,1,7],
  ['prelim_shortlist','初步候选人汇总+镇级初审',-13,1,8],
  ['joint_review','区级11部门联审、党委考察',-12,6,9],
  ['formal_notice','正式候选人公示',-6,1,10],
  ['campaign_prep','投票竞选筹备',-5,5,11],
  ['election_day','正式选举',0,1,12],
  ['result_filing','结果备案',1,5,13],
  ['handover','新旧班子交接',6,5,14],
];
const COMMUNITY = [
  ['prep','前期筹备',-35,1,1],
  ['elect_committee','成立选委会',-34,1,2],
  ['resident_reg','居民/户代表登记',-33,5,3],
  ['resident_list','公示登记名册',-20,1,4],
  ['resident_appeal','申诉核查',-19,4,5],
  ['nominate_start','候选人提名启动',-15,1,6],
  ['nominate_cont','提名持续收集',-14,1,7],
  ['prelim_shortlist','初步候选人汇总+街道初审',-13,1,8],
  ['joint_review','区级多部门联审、党工委考察',-12,6,9],
  ['formal_notice','正式候选人公示',-6,1,10],
  ['campaign_prep','竞选投票筹备',-5,5,11],
  ['election_day','正式竞选投票',0,1,12],
  ['result_filing','结果备案',1,5,13],
  ['handover','新旧班子交接',6,5,14],
];
for (const [key,name,off,end,ord] of VILLAGE)
  await pool.query("insert into stage_templates(st_key,st_name,st_day_offset,st_duration_days,st_order,org_type) values($1,$2,$3,$4,$5,'village') on conflict (st_key,org_type) do update set st_name=$2,st_day_offset=$3,st_duration_days=$4,st_order=$5",[key,name,off,end,ord]);
for (const [key,name,off,end,ord] of COMMUNITY)
  await pool.query("insert into stage_templates(st_key,st_name,st_day_offset,st_duration_days,st_order,org_type) values($1,$2,$3,$4,$5,'community') on conflict (st_key,org_type) do update set st_name=$2,st_day_offset=$3,st_duration_days=$4,st_order=$5",[key,name,off,end,ord]);
console.log('stage_templates 村/居两版已填充：', VILLAGE.length + COMMUNITY.length, '条');

// ---- 4. roles + role_permissions ----
const ROLES = [
  ['platform_admin','平台超管',true],['sub_admin','子管理',true],['editor','经办编辑',true],
  ['reviewer','审核人',true],['candidate','参选人',false],
];
for (const [k,n,s] of ROLES)
  await pool.query("insert into roles(key,name,is_staff) values($1,$2,$3) on conflict (key) do nothing",[k,n,s]);
const ALL_PERMS = ['org:create','org:manage','role:manage','account:create','account:manage','proposal:create','proposal:edit','proposal:review','material:edit','material:review','candidate:edit','candidate:review','announcement:edit','announcement:review','announcement:publish','data:view'];
const EDITOR_PERMS = ['proposal:create','proposal:edit','material:edit','candidate:edit','announcement:edit','data:view'];
const REVIEWER_PERMS = ['proposal:review','material:review','candidate:review','announcement:review','data:view'];
const PERM_MAP = { platform_admin: ALL_PERMS, sub_admin: ALL_PERMS, editor: EDITOR_PERMS, reviewer: REVIEWER_PERMS, candidate: [] };
for (const [role, perms] of Object.entries(PERM_MAP))
  for (const p of perms)
    await pool.query("insert into role_permissions(role_key,permission) values($1,$2) on conflict do nothing",[role,p]);
console.log('roles + role_permissions 已填充');

// ---- 5. 恢复 announcement_templates（从备份，后续按甲方 DOCX 核对）----
const bak = JSON.parse(readFileSync(join(__dirname,'db-backup','20260904-pre-rebuild','announcement_templates.json'),'utf8'));
for (const r of bak) {
  await pool.query("insert into announcement_templates(at_code,at_name,at_version,at_content,at_need_remind,at_note,active) values($1,$2,$3,$4,$5,$6,$7) on conflict (at_code,at_version) do update set at_name=$2,at_content=$4,at_note=$6,active=$7",
    [r.at_code,r.at_name,r.at_version??'通用',r.at_content??'',!!r.at_need_remind,r.at_note??null,r.active??true]);
}
console.log('announcement_templates 已恢复：', bak.length, '条');

// ---- 6. 演示 seed ----
const ORGS = [
  ['demo-village','演示村','village'],['demo-community','演示社区','community'],
];
const orgIds = {};
for (const [slug,name,type] of ORGS) {
  const r = (await pool.query("insert into organizations(slug,name,org_type) values($1,$2,$3) on conflict (slug) do update set name=$2,org_type=$3 returning id",[slug,name,type])).rows[0];
  orgIds[slug] = r.id;
}
const PWD = await passwordHash('123456');
const ACCOUNTS = [
  ['13800000000','平台超管','demo-village','platform_admin'],
  ['13800000001','演示村子管理','demo-village','sub_admin'],
  ['13800000002','演示村经办编辑','demo-village','editor'],
  ['13800000003','演示村审核人','demo-village','reviewer'],
  ['13800000011','演示社区子管理','demo-community','sub_admin'],
  ['13800000012','演示社区经办编辑','demo-community','editor'],
  ['13800000013','演示社区审核人','demo-community','reviewer'],
];
for (const [phone,name,slug,role] of ACCOUNTS) {
  const u = (await pool.query("insert into users(phone,password_hash,display_name) values($1,$2,$3) on conflict (phone) do update set password_hash=$2,display_name=$3 returning id",[phone,PWD,name])).rows[0];
  await pool.query("insert into memberships(user_id,organization_id,role) values($1,$2,$3) on conflict (user_id) do update set organization_id=$2,role=$3",[u.id,orgIds[slug],role]);
}
console.log('演示账号已填充：', ACCOUNTS.length, '个（密码均 123456）');

// 届次 + 单位 + 封地 + 日程
const term = (await pool.query("insert into election_terms(name,status) values('2026年村居换届','active') returning id")).rows[0].id;
const FIEFS = [
  ['demo-village','演示村换届','2026-12-20','village'],
  ['demo-community','演示社区换届','2026-12-27','community'],
];
for (const [slug,name,dDay,otype] of FIEFS) {
  const unit = (await pool.query("insert into election_units(organization_id,name) values($1,$2) on conflict (organization_id,name) do update set name=$2 returning id",[orgIds[slug],name])).rows[0].id;
  const f = (await pool.query("insert into election_fiefs(election_term_id,organization_id,unit_id,name,d_day,created_by) values($1,$2,$3,$4,$5,$6) returning id",
    [term,orgIds[slug],unit,name,dDay,(await pool.query("select id from users where phone='13800000000'")).rows[0].id])).rows[0].id;
  const tpl = (await pool.query("select id,st_key,st_name,st_day_offset,st_duration_days,st_order from stage_templates where org_type=$1 and active order by st_order",[otype])).rows;
  for (const t of tpl)
    await pool.query("insert into election_fief_stages(election_fief_id,stage_template_id,stage_key,stage_name,start_date,end_date,stage_order) values($1,$2,$3,$4,$5,$6,$7)",
      [f,t.id,t.st_key,t.st_name,addDays(dDay,t.st_day_offset),addDays(dDay,t.st_day_offset+Math.max(0,t.st_duration_days-1)),t.st_order]);
  console.log('封地已建：', name, 'D日', dDay, '日程', tpl.length, '阶段');
}
console.log('=== 重建完成 ===');
await pool.end();
