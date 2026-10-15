const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require(process.env.TEST_TYPESCRIPT_MODULE || 'typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}, env = {}) {
  const filename = path.join(root, file);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true}}).outputText;
  const exports = {};
  const sandbox = {exports, module: {exports}, require(name) {
    if (name in mocks) return mocks[name];
    if (name === '@/app/api/ai/_security') return require('./helpers/runtime.cjs').load('src/app/api/ai/_security.ts', { ...mocks, '@/lib/session': mocks['@/lib/session'] || { hasSession: async () => false } }, env);
    if (name.startsWith('node:') || ['fs', 'path', 'crypto', 'child_process'].includes(name)) return require(name);
    throw Error('Unexpected import: ' + name);
  }, process: {env}, console: mocks.__console || {log(){}, warn(){}, error(){}}, setImmediate(){}, setInterval(){return {unref(){}}}, Date: mocks.__Date || Date, Buffer};
  sandbox.global = sandbox;
  vm.runInNewContext(code, sandbox, {filename});
  return exports;
}
const next = {'next/server': {NextResponse: {json(data, options = {}) { return {status: options.status || 200, data}; }}}};
const req = (body, headers = {}) => ({json: async () => body, headers: {get: name => headers[name.toLowerCase()] || null}});
test('password reset is disabled when no emergency key is configured', async () => {
  const s = fs.readFileSync(path.join(root,'src/app/api/admin/emergency-reset/route.ts'),'utf8');
  const fallback = s.match(/EMERGENCY_ADMIN_KEY\s*\|\|\s*'([^']+)'/)?.[1] || 'unconfigured-reset-key';
  let accessed = false;
  const route = load('src/app/api/admin/emergency-reset/route.ts', {...next,
    '@/storage/database/supabase-client': {getSupabaseClient(){accessed = true;throw Error('DB must not be reached');}},
    '@/lib/password': {hashPassword: async () => 'HASH'},
  });
  const response = await route.POST(req({adminKey: fallback, username:'demo',newPassword:'test-passphrase'}));
  assert.equal(accessed, false);
  assert.equal(response.status, 403);
});
test('cron cleanup refuses the old default key when unconfigured', async () => {
  let accessed = false;
  const route = load('src/app/api/admin/cleanup-expired-users/route.ts', {...next,
    '@/storage/database/supabase-client': {getSupabaseClient(){accessed=true;throw Error('DB must not be reached');}},
  });
  const response = await route.POST(req({}, {authorization:'Bearer default-cron-secret'}));
  assert.equal(accessed,false);assert.equal(response.status,401);
});
test('AI diagnostics reject missing token in development and production', async () => {
  for (const env of [{}, {COZE_PROJECT_ENV:'DEV'}]) {
    const route = load('src/app/api/ai-quality/chat/route.ts', {...next,'@/lib/ai-quality-logger': {}}, env);
    assert.equal((await route.POST(req({}))).status,401);
  }
});
const password = {'@/lib/password': {hashPassword: async value => 'HASH:' + value,isHashedPassword: () => false}};
function store(client, env = {}) {
  return load('src/lib/db-store.ts', {...password,
    '@/storage/database/supabase-client': {getSupabaseClient: () => client,waitForSequenceCheck: async () => {},resetSupabaseClient(){}},
  },env);
}
test('administrator bootstrap refuses missing credentials before database access', async () => {
  let accessed=false;
  const api = store({from(){accessed=true;throw Error('DB must not be reached');}});
  await assert.rejects(() => api.ensureDefaultAdmin());assert.equal(accessed,false);
});
test('sessions use 32 bytes of cryptographic randomness', async () => {
  const stored=[];
  const api = store({from(){return {insert: async value => {stored.push(value);return {error:null};}};}});
  const a=await api.createSession(1), b=await api.createSession(1);
  assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);assert.equal(stored[0].token,a);
});
test('expired, future, and invalid sessions are rejected on read', async () => {
  for (const created of [new Date(Date.now()-25*3600000).toISOString(),'invalid',new Date(Date.now()+3600000).toISOString()]) {
    const api=store({from(){return {select(){return this;},eq(){return this;},single:async()=>({data:{token:'session',user_id:1,created_at:created},error:null})};}});
    assert.equal(await api.getSession('session'),undefined);
  }
});
test('creating a database client does not write sequence probe records by default', () => {
  let accessed=false;
  const db=load('src/storage/database/supabase-client.ts', {dotenv:{config(){}},'@supabase/supabase-js': {createClient(){return {from(){accessed=true;throw Error('No probe writes');}};}}},
    {COZE_SUPABASE_URL:'https://example.supabase.co',COZE_SUPABASE_ANON_KEY:'test-only-placeholder'});
  db.getSupabaseClient();assert.equal(accessed,false);
});
test('a current session remains valid', async () => {
  const api=store({from(){return {select(){return this;},eq(){return this;},single:async()=>({data:{token:'session',user_id:1,created_at:new Date().toISOString()},error:null})};}});
  assert.equal((await api.getSession('session')).userId,1);
});
test('AI diagnostics accept configured token with authenticated administrator', async () => {
  const route = load('src/app/api/ai-quality/chat/route.ts', {...next,'@/lib/ai-quality-logger': {},'@/lib/session':{hasSession:async()=>true,getSessionUserId:async()=>7,getSessionUserInfo:async()=>({id:7,role:'admin'})}}, {DEBUG_TOKEN:'unit-test-token'});
  assert.equal((await route.POST(req({}, {'x-debug-token':'unit-test-token',authorization:'Bearer fixture-session'}))).status,200);
});
test('failed login never logs any portion of stored password', async () => {
  const logs=[];
  const security={getClientIp:()=> '127.0.0.1',isIpBlacklisted:()=>false,checkRateLimit:()=>({allowed:true}),RATE_LIMITS:{auth:{}},isLoginLocked:()=>({locked:false}),recordLoginFailure:()=>({remaining:3,locked:false}),clearLoginFailure(){},createRateLimitResponse(){}};
  const route=load('src/app/api/auth/login/route.ts', {...next,
    '@/lib/store':{getUserByUsername:async()=>({id:1,password:'SENSITIVE-STORED-PASS'})},
    '@/lib/session':{},'@/lib/db-store':{createLoginRecord:async()=>{}},
    '@/lib/password':{isHashedPassword:()=>false,verifyPassword:async()=>false},
    '@/lib/security':security,__console:{log: s=>logs.push(s),warn:s=>logs.push(s),error:s=>logs.push(s)},
  });
  assert.equal((await route.POST(req({username:'demo',password:'wrong-password'}))).status,401);
  assert.equal(logs.some(s=>s.includes('SENSITIVE-')),false);
});
test('legacy in-memory sessions expire immediately without waiting for cleanup timer', async () => {
  let now=Date.now();
  class Clock extends Date {static now(){return now;}}
  const session=load('src/lib/session.ts',{'./store':{getSession:async()=>undefined},__Date:Clock});
  session.setSession('legacy-test', '1');
  assert.equal(await session.hasSession('legacy-test'),true);
  now+=25*3600000;
  assert.equal(await session.hasSession('legacy-test'),false);
  assert.equal(await session.getSessionUserId('legacy-test'),null);
});
