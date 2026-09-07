/**
 * 迁移文件执行器（幂等）：
 * - 不传参：按文件名顺序执行 migrations/ 下全部 .sql（DDL 均为 add column if not exists / on conflict，可重复执行）。
 * - 传文件名参数（相对 migrations/）：仅执行指定文件，如 `tsx src/migrate-file.ts 20260907_proposal_workbench_align.sql`
 * 用 schema_migrations 记录已执行文件名，避免重复。
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const only = process.argv[2] ? basename(process.argv[2]) : null;
const pool = new Pool({ connectionString, max: 1 });
const client = await pool.connect();
try {
  await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  let files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
  if (only) files = files.filter(f => f === only);
  if (!files.length) throw new Error(only ? `migration not found: ${only}` : 'no migration files');
  for (const f of files) {
    const done = (await client.query('select 1 from schema_migrations where name=$1', [f])).rowCount;
    if (done && !only) { console.log('skip (applied):', f); continue; }
    const sql = await readFile(join(migrationsDir, f), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations(name) values($1) on conflict do nothing', [f]);
      await client.query('commit');
      console.log('applied:', f);
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
  console.log('migration done');
} finally {
  client.release();
  await pool.end();
}
