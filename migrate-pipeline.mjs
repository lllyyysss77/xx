// schema 增量：election_proposals + positions + 公告排期字段（不动现有演示数据）
import { Pool, types } from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
types.setTypeParser(1082, v => v);
const __dirname = dirname(fileURLToPath(import.meta.url));
const url = readFileSync(join(__dirname, '.env'), 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
const pool = new Pool({ connectionString: url, max: 2 });

await pool.query(`
create table if not exists election_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  term_id uuid not null references election_terms(id),
  unit_id uuid not null references election_units(id),
  name text not null,
  d_day date not null,
  org_type text not null check (org_type in ('village','community')),
  positions jsonb not null default '[{"name":"主任","quota":1},{"name":"副主任","quota":1},{"name":"委员","quota":3},{"name":"妇女成员","quota":1}]',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  proposed_by uuid not null references users(id),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, term_id)
);`);
console.log('election_proposals 就绪');

await pool.query(`
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  election_fief_id uuid not null references election_fiefs(id) on delete cascade,
  name text not null,
  quota integer not null default 1,
  application_start date not null,
  application_end date not null,
  material_review_start date not null,
  material_review_end date not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
create index if not exists positions_fief_idx on positions(election_fief_id);`);
console.log('positions 就绪');

await pool.query(`alter table announcement_templates add column if not exists at_sched_offset integer;`);
await pool.query(`alter table announcements add column if not exists scheduled_for date;`);
await pool.query(`alter table announcements add column if not exists stage_key text;`);
console.log('公告排期字段就绪');

await pool.end();
console.log('=== schema 增量完成 ===');
