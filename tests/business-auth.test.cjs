const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require(process.env.TEST_TYPESCRIPT_MODULE || 'typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const filename = path.join(root, 'src/app/api', file, 'route.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, module: { exports }, URL, Date, Math, process: { env: {} }, console: { log(){}, error(){}, warn(){} }, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (data, opts = {}) => ({ data, status: opts.status || 200 }) } };
    if (name in mocks) return mocks[name];
    throw Error('Unexpected import: ' + name);
  } }, { filename });
  return exports;
}
const request = (body = {}, token = 'test-session', url = 'https://test.invalid/') => ({ url, json: async () => body, cookies: { get(){} }, headers: { get: n => n === 'authorization' && token ? 'Bearer ' + token : null } });
const session = { hasSession: async () => true, getSessionUserId: async () => 7, getSessionUserInfo: async () => ({ id: 7, username: 'fixture', role: 'user' }), getSessionUser: async () => ({ id: 7, uid: '70000007', role: 'user' }) };
for (const file of ['product-profiles/[id]/auto-fill', 'product-profiles/[id]/save-analysis']) {
  test(file + ' rejects anonymous requests before storage access', async () => {
    let reads = 0;
    const route = load(file, { '@/lib/session': session, '@/lib/db-store': { getProductProfileById: async () => { reads++; return { id: 1, uid: '7', analysisCompleted: true }; }, updateProductProfile: async () => ({}) } });
    const response = await route.POST(request({ analysisType: 'selling_point', result: 'fixture' }, null), { params: Promise.resolve({ id: '1' }) });
    assert.equal(response.status, 401); assert.equal(reads, 0);
  });
  test(file + ' rejects another owner without mutation', async () => {
    let writes = 0;
    const route = load(file, { '@/lib/session': session, '@/lib/db-store': { getProductProfileById: async () => ({ id: 1, uid: '8', analysisCompleted: true }), updateProductProfile: async () => { writes++; return {}; } } });
    const response = await route.POST(request({ analysisType: 'selling_point', result: 'fixture' }), { params: Promise.resolve({ id: '1' }) });
    assert.equal(response.status, 404); assert.equal(writes, 0);
  });
}
test('commission creation refuses anonymous and non-admin callers', async () => {
  const route = load('agent/commission', { '@/lib/session': session });
  for (const token of [null, 'test-session']) {
    const response = await route.POST(request({ inviteeUid: '8', inviterUid: '7', orderId: 'fixture-order', orderAmount: 100 }, token));
    assert.equal(response.status, token ? 403 : 401);
    const records = await route.GET(request({}, 'test-session'));
    assert.equal(records.status, 410);
    assert.equal(records.data.code, 'LEGACY_SERVICE_RETIRED');
  }
});
for (const file of ['materials', 'customer/materials']) {
  for (const method of ['POST', 'PUT']) {
    test(file + ' ' + method + ' refuses foreign customer or product links', async () => {
      for (const link of [{ customerId: 21 }, { productId: 22 }]) {
        let writes = 0;
        const db = { getMaterialById: async () => ({ id: 1, uid: '7' }), getCustomerById: async () => ({ uid: '8' }), getProductProfileById: async () => ({ uid: '8' }), createMaterial: async () => { writes++; return {}; }, updateMaterial: async () => { writes++; return {}; } };
        const route = load(file, { '@/lib/session': session, '@/lib/db-store': db });
        const response = await route[method](request({ id: 1, topic: 'fixture', scriptType: 'story', ...link }));
        assert.equal(response.status, 404); assert.equal(writes, 0);
      }
    });
  }
}
function redemption(user = { id: 7, uid: '70000007', role: 'admin' }) {
  const filters = [];
  let writes = 0;
  const client = { from(table) { const query = { select(){return this;}, eq(key,value){ filters.push([table,key,value]); return this; }, order(){return this;}, limit(){return this;}, single: async () => ({ data: { id: 4, uid: user.uid, user_id: user.id, agent_level: 1, status: 'active', points_balance: 10000 } }), then(resolve){resolve({data:[],error:null});}, insert(){writes++;return this;} }; return query; } };
  const route = load('redemption/generate', { '@/lib/session': session, '@/storage/database/supabase-client': { getSupabaseClient: () => client }, '@/lib/db-store': { getUserById: async () => user }, '@/lib/permissions': { isSuperAdmin: uid => uid === '10000001' }, '@/lib/points-config': { POINTS_COST: { power_10000: 29 }, CODE_TYPE_REWARDS: { power_10000: {power:10000,days:365} }, getPointsCost: () => 29, canGenerateCodeType: () => true }, '@/lib/points-service': {} });
  return { route, filters, get writes(){return writes;} };
}
test('agent redemption list is scoped to creator UID', async () => {
  const fixture = redemption();
  assert.equal((await fixture.route.GET(request())).status, 200);
  assert.ok(fixture.filters.some(([table,key,value]) => table === 'redemption_codes' && key === 'created_by' && value === '70000007'));
});
test('redemption writes remain disabled for every legacy input without any write', async () => {
  for (const body of [{count:1.5,type:'power_10000'}, {count:'2',type:'power_10000'}, {count:1,type:'power_10000',maxUses:2}, {count:1,type:'unknown'}, {count:1,type:'power_10000',expiresAt:'not-a-date'}]) {
    const fixture = redemption();
    assert.equal((await fixture.route.POST(request(body))).status, 503);
    assert.equal(fixture.writes, 0);
  }
});
for (const method of ['POST', 'PUT']) {
  test('ordinary admin cannot grant administrator by super_admin alias via ' + method, async () => {
    let writes = 0;
    const operator = { id: 7, uid: '70000007', role: 'admin', username: 'fixture' };
    const route = load('admin/users', {
      '@/lib/session': session,
      '@/lib/security': { getClientIp: () => '127.0.0.1', isIpBlacklisted: () => false, checkRateLimit: () => ({ allowed: true }), RATE_LIMITS: { admin: {} } },
      '@/lib/permissions': { isSuperAdmin: () => false, getEffectiveRole: (_uid, role) => role, canManageUser: () => true, canCreateAdmin: () => false },
      '@/lib/store': { getUserById: async id => id === 7 ? operator : { id: 8, uid: '80000008', role: 'user', inviterId: 7 }, createUser: async () => { writes++; return {}; }, updateUser: async () => { writes++; return {}; }, createOperationLog: async () => {} },
    });
    const response = await route[method](request({ id: 8, username: 'fixture_user', password: 'fixture-password', role: 'super_admin' }));
    assert.equal(response.status, 403); assert.equal(writes, 0);
  });
}
test('database ID equal to privileged UID does not grant agent account administration', async () => {
  const route = load('agent/account', { '@/lib/session': { ...session, getSessionUser: async () => ({ id: 10000001, uid: '70000007', role: 'user' }) }, '@/lib/db-store': { getUserById: async () => ({ id: 8 }), getAgentAccountByUserId: async () => null }, '@/storage/database/supabase-client': { getSupabaseClient: () => { throw Error('Forbidden storage access'); } } });
  assert.equal((await route.POST(request({ userId: 8, agentPath: 'fixture' }))).status, 403);
});

for (const method of ['PUT', 'DELETE']) {
  test('ordinary admin cannot mutate users outside their inviter scope via ' + method, async () => {
    let writes = 0;
    const operator = { id: 7, uid: '70000007', role: 'admin' };
    const route = load('admin/users', {
      '@/lib/session': session,
      '@/lib/security': { getClientIp: () => '127.0.0.1', isIpBlacklisted: () => false, checkRateLimit: () => ({ allowed: true }), RATE_LIMITS: { admin: {} } },
      '@/lib/permissions': { isSuperAdmin: () => false, getEffectiveRole: (_uid, role) => role, canManageUser: () => true, canCreateAdmin: () => false },
      '@/lib/store': { getUserById: async id => Number(id) === 7 ? operator : { id: 8, uid: '80000008', role: 'user', inviterId: 9 }, deleteUser: async () => { writes++; return true; }, updateUser: async () => { writes++; return {}; }, createOperationLog: async () => {} },
    });
    const response = await route[method](request({ id: 8, maxCustomers: 20 }, 'test-session', 'https://test.invalid/?id=8'));
    assert.equal(response.status, 403); assert.equal(writes, 0);
  });
}
for (const file of ['materials', 'customer/materials']) {
  test(file + ' permits owned references and forces material UID to session ID', async () => {
    let saved;
    const db = { getCustomerById: async () => ({ uid: '7' }), getProductProfileById: async () => ({ uid: '7' }), createMaterial: async data => { saved = data; return data; } };
    const route = load(file, { '@/lib/session': session, '@/lib/db-store': db });
    const response = await route.POST(request({ uid: '8', topic: 'fixture', scriptType: 'story', customerId: 21, productId: 22 }));
    assert.equal(response.status, 200); assert.equal(saved.uid, '7');
  });
}
for (const file of ['product-profiles/[id]/auto-fill', 'product-profiles/[id]/save-analysis']) {
  test(file + ' permits owner using database ID rather than public UID', async () => {
    let writes = 0;
    const route = load(file, { '@/lib/session': session, '@/lib/db-store': { getProductProfileById: async () => ({ id: 1, uid: '7', analysisCompleted: true, sellingPoints: ['fixture'] }), updateProductProfile: async () => { writes++; return {}; } } });
    const response = await route.POST(request({ analysisType: 'selling_point', result: 'fixture' }), { params: Promise.resolve({ id: '1' }) });
    assert.equal(response.status, 200);
    if (file.endsWith('save-analysis')) assert.equal(writes, 1);
  });
}
test('super administrator retains global redemption list access', async () => {
  const fixture = redemption({ id: 7, uid: '70000007', role: 'super_admin' });
  assert.equal((await fixture.route.GET(request())).status, 200);
  assert.equal(fixture.filters.some(([table,key]) => table === 'redemption_codes' && key === 'created_by'), false);
});

test('owned user password update passes to store but is omitted from operation logs and response', async () => {
  let changed, log;
  const operator = { id: 7, uid: '70000007', role: 'admin' };
  const route = load('admin/users', {
    '@/lib/session': session,
    '@/lib/security': { getClientIp: () => '127.0.0.1', isIpBlacklisted: () => false, checkRateLimit: () => ({ allowed: true }), RATE_LIMITS: { admin: {} } },
    '@/lib/permissions': { isSuperAdmin: () => false, getEffectiveRole: (_uid, role) => role, canManageUser: () => true, canCreateAdmin: () => false },
    '@/lib/store': { getUserById: async id => id === 7 ? operator : { id: 8, uid: '80000008', role: 'user', inviterId: 7 }, updateUser: async (_id, data) => { changed = data; return { id: 8, password: 'fixture-hash' }; }, createOperationLog: async data => { log = data; } },
  });
  const response = await route.PUT(request({ id: 8, password: 'fixture-new-password' }));
  assert.equal(response.status, 200); assert.equal(changed.password, 'fixture-new-password');
  assert.equal('password' in log.details.changes, false);
  assert.equal('password' in response.data.data, false);
});
for (const [file, methods, storeName] of [
  ['customer/list', ['GET', 'POST', 'DELETE'], '@/lib/store'],
  ['customer/update', ['POST'], '@/lib/store'],
  ['materials', ['GET', 'POST', 'PUT', 'DELETE'], '@/lib/db-store'],
  ['product-profiles', ['GET', 'POST', 'PUT', 'DELETE'], '@/lib/db-store'],
]) {
  test(file + ' rejects anonymous CRUD without storage access', async () => {
    let accessed = false;
    const db = new Proxy({}, { get(){ return () => { accessed = true; throw Error('Must not access storage'); }; } });
    const route = load(file, { '@/lib/session': session, [storeName]: db });
    for (const method of methods) assert.equal((await route[method](request({ id: 1 }, null))).status, 401);
    assert.equal(accessed, false);
  });
}
for (const [file, method, getter, setter, storeName] of [
  ['customer/update', 'POST', 'getCustomerById', 'updateCustomer', '@/lib/store'],
  ['materials', 'PUT', 'getMaterialById', 'updateMaterial', '@/lib/db-store'],
  ['product-profiles', 'PUT', 'getProductProfileById', 'updateProductProfile', '@/lib/db-store'],
]) {
  test(file + ' rejects updating another owner record', async () => {
    let writes = 0;
    const route = load(file, { '@/lib/session': session, [storeName]: { [getter]: async () => ({ id: 1, uid: '8' }), [setter]: async () => { writes++; return {}; } } });
    const response = await route[method](request({ id: 1, name: 'fixture', title: 'fixture' }));
    assert.ok([403, 404].includes(response.status)); assert.equal(writes, 0);
  });
}
for (const body of [
  { codeType: 'permanent' }, { codeType: 'power_10000' }, { codeType: 'monthly', codeCount: -1 }, { codeType: 'monthly', codeCount: 1.5 }, { codeType: 'monthly', codeCount: '2' },
]) {
  test('agent create-user stays disabled without looking up or mutating storage ' + JSON.stringify(body), async () => {
    let storage = false;
    const route = load('agent/create-user', {
      '@/lib/session': session,
      '@/lib/db-store': { getAgentAccountByUserId: async () => ({ id: 4, canCreateUser: true, status: 'active', pointsBalance: 1000 }) },
      '@/storage/database/supabase-client': { getSupabaseClient: () => ({ from(){storage = true; throw Error('No storage writes or lookup expected');} }) },
      '@/lib/db-utils': {}, '@/lib/password': {}, '@/lib/points-config': { POINTS_COST: { trial: 0, monthly: 0, yearly: 0, power_10000: 29 } }, '@/lib/points-service': {}, '@/lib/permissions': { isSuperAdmin: () => false },
    });
    const response = await route.POST(request({ username: 'fixture_user', password: 'fixture-password', ...body }));
    assert.equal(response.status, 503); assert.equal(storage, false);
  });
}
test('auto-fill uses real store camelCase contract and returns persisted enrichment', async () => {
  const row = { id: 1, uid: '7', name: 'fixture-product', analysis_completed: true, selling_points: ['fixture-existing'], value_ladder_basic: 'fixture-basic', value_ladder_advanced: 'fixture-advanced', value_ladder_top: 'fixture-top', user_age_range: 'fixture-age', pain_points_json: JSON.stringify([{ pain: 'fixture-pain', intensity: 8, scenario: 'fixture-scenario' }]) };
  let columns, argument;
  const client = { from(table) {
    assert.equal(table, 'product_profiles');
    return { select(){return this;}, eq(key, value){assert.equal(key, 'id');assert.equal(value, 1);return this;}, update(data){ columns = data; Object.assign(row, data); return this; }, single: async () => ({ data: { ...row }, error: null }) };
  } };
  const filename = path.join(root, 'src/lib/db-store.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, module: { exports }, Date, process: { env: {} }, console: { log(){}, error(){}, warn(){} }, require(name) {
    if (name === 'node:crypto') return require(name);
    if (name === '@/storage/database/supabase-client') return { getSupabaseClient: () => client };
    if (name === '@/lib/password') return {};
    throw Error('Unexpected store import: ' + name);
  } }, { filename });
  const route = load('product-profiles/[id]/auto-fill', { '@/lib/session': session, '@/lib/db-store': { getProductProfileById: exports.getProductProfileById, updateProductProfile: async (id, data) => { argument = data; return exports.updateProductProfile(id, data); } } });
  const response = await route.POST(request(), { params: Promise.resolve({ id: '1' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(argument).sort(), ['sellingPoints', 'targetUsers', 'userPainPoints']);
  assert.deepEqual(Array.from(argument.sellingPoints), ['fixture-existing', 'fixture-basic', 'fixture-advanced', 'fixture-top']);
  assert.equal(argument.targetUsers, 'fixture-age');
  assert.ok(argument.userPainPoints.includes('fixture-pain') && argument.userPainPoints.includes('fixture-scenario'));
  const persisted = await exports.getProductProfileById(1);
  for (const field of ['sellingPoints', 'targetUsers', 'userPainPoints']) assert.deepEqual(response.data.profile[field], persisted[field]);
  assert.deepEqual(Array.from(columns.selling_points), Array.from(argument.sellingPoints));
  assert.equal(columns.target_users, argument.targetUsers);
  assert.equal(columns.user_pain_points, argument.userPainPoints);
});
