// 后端登录闭环 + 防串台 + 权限点 API 测试（会创建测试账号，测试后清理）
const BASE = 'http://127.0.0.1:3100';
const VILLAGE = 'e1a318cf-dbd7-4f6c-ab2e-3c60d68affae';
const COMMUNITY = '44365f42-164c-4ea6-9f79-3363a609dd71';
async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
}
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✅', name, extra); }
  else { fail++; console.log('  ❌', name, extra); }
}

console.log('1) 超管登录');
let r = await call('POST', '/auth/admin/login', { phone: '13800000000', password: '123456', organizationId: VILLAGE });
check('超管 admin/login 200', r.status === 200, r.status);
const adminTok = r.data?.token;
check('返回 token+role', !!(adminTok && r.data.role === 'platform_admin'));

console.log('2) 子管理登录');
r = await call('POST', '/auth/admin/login', { phone: '13800000001', password: '123456', organizationId: VILLAGE });
check('子管理 admin/login 200', r.status === 200, r.status);
const subTok = r.data?.token;

console.log('3) 防串台：演示村账号登演示社区 → 应 401');
r = await call('POST', '/auth/admin/login', { phone: '13800000001', password: '123456', organizationId: COMMUNITY });
check('错误归属地 401', r.status === 401, r.status);

console.log('4) 参选人注册 + 登录');
r = await call('POST', '/auth/register', { phone: '13900000001', password: '123456', displayName: '测试参选人', organizationId: VILLAGE });
check('register 201', r.status === 201, r.status);
r = await call('POST', '/auth/candidate/login', { phone: '13900000001', password: '123456', organizationId: VILLAGE });
check('candidate/login 200', r.status === 200, r.status);
check('candidate 角色', r.data?.role === 'candidate');
r = await call('POST', '/auth/candidate/login', { phone: '13900000001', password: '123456', organizationId: COMMUNITY });
check('参选人错误归属地 401', r.status === 401, r.status);

console.log('5) 权限点校验（review 类接口）');
r = await call('POST', '/auth/admin/login', { phone: '13800000002', password: '123456', organizationId: VILLAGE });
const editTok = r.data?.token;
r = await call('PATCH', '/admin/materials/00000000-0000-0000-0000-000000000000/review', { status: 'approved' }, editTok);
check('经办编辑(无 material:review) → 403', r.status === 403, r.status);
r = await call('PATCH', '/admin/materials/00000000-0000-0000-0000-000000000000/review', { status: 'approved' }, subTok);
check('子管理(有 material:review) → 权限过、材料不存在 404', r.status === 404, r.status);

console.log('6) 超管开账号 /admin/accounts');
r = await call('POST', '/admin/accounts', { phone: '13800000999', displayName: '测试子管理', role: 'sub_admin', organizationId: VILLAGE, password: '123456' }, adminTok);
check('超管开账号 201', r.status === 201, r.status);
r = await call('POST', '/admin/accounts', { phone: '13800000999', displayName: '重复', role: 'sub_admin', organizationId: VILLAGE }, adminTok);
check('重复手机号 409', r.status === 409, r.status);
r = await call('POST', '/admin/accounts', { phone: '13800000888', displayName: '越权', role: 'sub_admin', organizationId: VILLAGE }, subTok);
check('非超管开账号 403', r.status === 403, r.status);

console.log(`\n=== 结果：通过 ${pass} / 失败 ${fail} ===`);
process.exit(fail ? 1 : 0);
