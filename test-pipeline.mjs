// pipeline 端到端压实测试：提案 → 审核通过 → 全自动生成（村/居两版 + 驳回 + 权限拦截 + 日期核对）
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// 自拉服务（同进程内，避免跨 Bash 会话进程被回收）
const srv = spawn(process.execPath, ['--env-file=.env', '--import', 'tsx/esm', 'src/server.ts'], { cwd: __dirname, stdio: 'ignore' });
let up = false;
for (let i = 0; i < 40; i++) {
  try { const r = await fetch('http://127.0.0.1:3100/health'); if (r.ok) { up = true; break; } } catch {}
  await new Promise(res => setTimeout(res, 500));
}
if (!up) { console.log('❌ 服务未能启动'); process.exit(1); }
console.log('✅ 后端服务已自拉起来');
const BASE = 'http://127.0.0.1:3100';
const VILLAGE = 'e1a318cf-dbd7-4f6c-ab2e-3c60d68affae';
const COMMUNITY = '44365f42-164c-4ea6-9f79-3363a609dd71';
const V_UNIT = 'b96ae57b-4329-4c1e-b6de-6a4bf10854a3';
const C_UNIT = '03df14f2-4ac7-4b0a-b6ea-1045a3a865e5';
const dbUrl = readFileSync(join(__dirname, '.env'), 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
const pool = new Pool({ connectionString: dbUrl, max: 2 });

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✅', name, extra); } else { fail++; console.log('  ❌', name, extra); }
}
async function call(method, path, body, token) {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
async function login(phone, org) {
  const r = await call('POST', '/auth/admin/login', { phone, password: '123456', organizationId: org });
  return r.data?.token;
}

// 0) 建测试届次（两个：正常流程 + 驳回分支）
const termR = await pool.query("insert into election_terms(name,status) values('2026换届测试届','draft') returning id");
const termId = termR.rows[0].id;
const termR2 = await pool.query("insert into election_terms(name,status) values('2026换届测试届-驳回','draft') returning id");
const termId2 = termR2.rows[0].id;

try {
  const superTok = await login('13800000000', VILLAGE);
  const editTok = await login('13800000002', VILLAGE);
  const revTok = await login('13800000003', VILLAGE);
  const subC = await login('13800000011', COMMUNITY);
  const revC = await login('13800000013', COMMUNITY);
  check('登录全部成功', !!(superTok && editTok && revTok && subC && revC));

  console.log('1) 权限拦截');
  let r = await call('POST', '/admin/proposals', { organizationId: VILLAGE, termId, unitId: V_UNIT, name: 'x', dDay: '2027-03-15' }, revTok);
  check('审核人不能提交提案 → 403', r.status === 403, r.status);
  r = await call('POST', '/admin/proposals/00000000-0000-0000-0000-000000000000/review', { decision: 'approved' }, editTok);
  check('经办编辑不能审核提案 → 403', r.status === 403, r.status);

  console.log('2) 演示村提案提交（带岗位职数）');
  r = await call('POST', '/admin/proposals', {
    organizationId: VILLAGE, termId, unitId: V_UNIT, name: '演示村2027换届', dDay: '2027-03-15',
    positions: [{ name: '主任', quota: 1 }, { name: '副主任', quota: 1 }, { name: '委员', quota: 3 }, { name: '妇女成员', quota: 1 }],
  }, editTok);
  check('提案提交 201', r.status === 201, r.status);
  const vp = r.data;
  check('提案状态 pending', vp.status === 'pending');
  r = await call('POST', '/admin/proposals', { organizationId: VILLAGE, termId, unitId: V_UNIT, name: '重复', dDay: '2027-03-15' }, editTok);
  check('同归属地同期次重复提案 → 409', r.status === 409, r.status);

  console.log('3) 审核通过 → pipeline 全自动生成');
  r = await call('POST', `/admin/proposals/${vp.id}/review`, { decision: 'approved' }, revTok);
  check('审核通过 201', r.status === 201, r.status);
  check('生成 14 阶段', r.data?.stages === 14, JSON.stringify(r.data));
  check('生成 4 岗位', r.data?.positions === 4);
  check('生成 16 条预排公告', r.data?.announcements === 16);
  const vf = r.data.fiefId;

  console.log('4) 村版日程核对（D日 2027-03-15）');
  r = await call('GET', `/admin/election-fiefs/${vf}/stages`, null, superTok);
  const st = r.data;
  check('阶段数 14', st.length === 14, st.length);
  const reg = st.find(s => s.stage_key === 'voter_reg');
  check('村选民登记 D-33~D-30 = 02-10~02-13', reg && reg.start_date === '2027-02-10' && reg.end_date === '2027-02-13', `${reg?.start_date}~${reg?.end_date}`);
  const nom = st.find(s => s.stage_key === 'nominate_start');
  check('提名启动 D-15 = 02-28', nom && nom.start_date === '2027-02-28');
  const day = st.find(s => s.stage_key === 'election_day');
  check('选举日 D0 = 03-15', day && day.start_date === '2027-03-15');

  console.log('5) 岗位核对（报名/材料窗口 D-15~D-13）');
  r = await call('GET', `/admin/positions?electionFiefId=${vf}`, null, superTok);
  const pos = r.data;
  check('4 个岗位', pos.length === 4, pos.map(p => p.name).join(','));
  check('报名起 02-28 / 止 03-02', pos[0]?.application_start === '2027-02-28' && pos[0]?.application_end === '2027-03-02', `${pos[0]?.application_start}~${pos[0]?.application_end}`);

  console.log('6) 预排公告核对');
  r = await call('GET', `/admin/announcements?electionFiefId=${vf}`, null, superTok);
  const anns = r.data;
  check('16 条预排公告', anns.length === 16, anns.length);
  const a1 = anns.find(a => a.template_code === '第1号');
  check('第1号(确定选举日)排期 D-34 = 02-09', a1?.scheduled_for === '2027-02-09', a1?.scheduled_for);
  const a7 = anns.find(a => a.template_code === '第7号');
  check('第7号(提名)排期 D-15 = 02-28', a7?.scheduled_for === '2027-02-28', a7?.scheduled_for);
  const a16 = anns.find(a => a.template_code === '第16号');
  check('第16号(选举结果)排期 D0 = 03-15', a16?.scheduled_for === '2027-03-15', a16?.scheduled_for);
  check('村版正文含"村民"', a1?.body.includes('村民'));

  console.log('7) 社区版（称谓替换 + 登记周期差异）');
  r = await call('POST', '/admin/proposals', { organizationId: COMMUNITY, termId, unitId: C_UNIT, name: '演示社区2027换届', dDay: '2027-03-22' }, subC);
  const cp = r.data;
  r = await call('POST', `/admin/proposals/${cp.id}/review`, { decision: 'approved' }, revC);
  check('社区提案审核通过 201', r.status === 201, r.status);
  const cf = r.data.fiefId;
  r = await call('GET', `/admin/election-fiefs/${cf}/stages`, null, superTok);
  const cs = r.data;
  const creg = cs.find(s => s.stage_key === 'resident_reg');
  check('居居民/户代表登记 D-33~D-29 = 02-17~02-21', creg && creg.start_date === '2027-02-17' && creg.end_date === '2027-02-21', `${creg?.start_date}~${creg?.end_date}`);
  check('社区阶段数 14', cs.length === 14, cs.length);
  r = await call('GET', `/admin/announcements?electionFiefId=${cf}`, null, superTok);
  const cA = r.data;
  const c1 = cA.find(a => a.template_code === '第1号');
  check('社区正文称谓替换为"居民"', c1?.body.includes('居民') && !c1.body.includes('村民'), c1?.title);

  console.log('8) 驳回分支');
  r = await call('POST', '/admin/proposals', { organizationId: VILLAGE, termId: termId2, unitId: V_UNIT, name: '演示村驳回测试', dDay: '2027-04-01' }, editTok);
  check('驳回用提案提交 201', r.status === 201, r.status);
  const rp = r.data;
  r = await call('POST', `/admin/proposals/${rp.id}/review`, { decision: 'rejected', note: '职数未定' }, revTok);
  check('驳回 200 + status=rejected', r.status === 200 && r.data.status === 'rejected', JSON.stringify(r.data));

  console.log(`\n=== pipeline 测试结果：通过 ${pass} / 失败 ${fail} ===`);
} finally {
  // 清理测试数据
  await pool.query('delete from election_proposals where term_id=$1 or term_id=$2', [termId, termId2]);
  await pool.query('delete from election_fiefs where election_term_id=$1 or election_term_id=$2', [termId, termId2]);
  await pool.query('delete from election_terms where id=$1 or id=$2', [termId, termId2]);
  const chk = await pool.query('select count(*)::int c from election_fiefs');
  console.log('已清理测试数据，剩余封地:', chk.rows[0].c, '（应为 2 个演示封地）');
  await pool.end();
  srv.kill();
}
process.exit(fail ? 1 : 0);
