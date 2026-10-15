const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load, next, request } = require('./helpers/runtime.cjs');

test('power check is pure and never reads React context', () => {
  let hooks = 0;
  const api = load('src/lib/power-check.ts', { '@/contexts/MemberContext': { useMember(){hooks++;throw Error('Hook called outside React');} } });
  assert.equal(api.checkPowerEnough(10, null), false);
  assert.equal(api.checkPowerEnough(10, { remaining: 10, total: 10 }), true);
  assert.equal(api.checkPowerEnough(10, { remaining: 9, total: 10 }), false);
  assert.equal(api.checkPowerEnough(10, { remaining: 0, total: 0, unlimited: true }), true);
  assert.equal(hooks, 0);
});
test('power hook reads context once and opens modal only on insufficient balance', () => {
  let hooks = 0;
  const modal = [];
  const api = load('src/lib/power-check.ts', { '@/contexts/MemberContext': { useMember(){hooks++;return { computingPower: { remaining: 20, total: 20 }, openPowerLowModal: n => modal.push(n) };} } });
  const check = api.usePowerCheck();
  assert.equal(check.checkAndConsume(10), true);
  assert.equal(check.checkAndConsume(30), false);
  assert.equal(hooks, 1);
  assert.deepEqual(modal, [30]);
});
test('redemption route stays disabled without invoking an unverified financial mutation', async () => {
  let argument;
  const route = load('src/app/api/redemption/redeem/route.ts', {
    ...next,
    '@/lib/db-store': { getUserById: async () => ({ id: 7 }), redeemRedemptionCode: async (...args) => { argument = args; return { success: false, error: 'fixture invalid code' }; } },
    '@/lib/session': { hasSession: async () => true, getSessionUserId: async () => 7 },
    '@/storage/database/supabase-client': { getSupabaseClient: () => ({}) }, '@/lib/commission-calculator': {}, '@/lib/creation-tasks': {}, '@/lib/invite-rewards': {}, '@/lib/credits-store': {},
  });
  const response = await route.POST(request({ code: ' FIXTURE-CODE ' }, { authorization: 'Bearer fixture-session' }));
  assert.equal(response.status, 503);
  assert.equal(argument, undefined);
});

test('real redemption mutation is exported with a non-hook name', async () => {
  let lookups = 0;
  const api = load('src/lib/db-store.ts', { '@/lib/password': {}, '@/storage/database/supabase-client': { getSupabaseClient: () => ({ from(table){assert.equal(table, 'redemption_codes');lookups++;return {select(){return this;},eq(){return this;},single:async()=>({data:null,error:null})};} }) } });
  assert.equal(typeof api.redeemRedemptionCode, 'function');
  assert.equal('useRedemptionCode' in api, false);
  assert.equal((await api.redeemRedemptionCode('FIXTURE-NONEXISTENT', 7)).success, false);
  assert.equal(lookups, 1);
});
test('agent status rejects anonymous before creating a database client', async () => {
  let accessed = false;
  const route = load('src/app/api/agent/status/route.ts', { ...next, '@/lib/session': {}, '@/lib/db-store': {}, '@/storage/database/supabase-client': { getSupabaseClient(){accessed = true;throw Error('Missing fixture config');} } });
  assert.equal((await route.GET(request())).status, 401);
  assert.equal(accessed, false);
});
test('agent status handles private database initialization errors safely', async () => {
  const route = load('src/app/api/agent/status/route.ts', { ...next, '@/lib/session': { hasSession: async () => true, getSessionUser: async () => ({ id: 7, uid: '70000007', role: 'user' }) }, '@/lib/db-store': {}, '@/storage/database/supabase-client': { getSupabaseClient(){throw Error('PRIVATE-FIXTURE-ERROR');} } });
  const response = await route.GET(request({}, { authorization: 'Bearer fixture-session' }));
  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(response.data).includes('PRIVATE-FIXTURE-ERROR'), false);
});
for (const endpoint of ['search', 'web-search']) test(endpoint + ' refuses anonymous callers before query parsing and SDK construction', async () => {
  let sdkCreated = false;
  const route = load('src/app/api/' + endpoint + '/route.ts', { ...next, '@/lib/session': { hasSession: async () => false, getSessionUserId: async () => null, getSessionUserInfo: async () => null }, 'coze-coding-dev-sdk': { Config: class { constructor(){sdkCreated = true;throw Error('SDK must not initialize');} }, HeaderUtils: { extractForwardHeaders: () => ({}) } } });
  for (const body of [{}, { query: 'fixture-query' }]) assert.equal((await route.POST(request(body))).status, 401);
  assert.equal((await route.POST(request({ query: 'fixture-query' }, { authorization: 'Bearer expired-fixture' }))).status, 401);
  assert.equal(sdkCreated, false);
});
test('web-search retains its response contract for an authenticated caller', async () => {
  let searches = 0;
  const route = load('src/app/api/web-search/route.ts', { ...next, '@/lib/session': { hasSession: async () => true, getSessionUserId: async () => 7, getSessionUserInfo: async () => ({ id: 7 }) }, 'coze-coding-dev-sdk': { Config: class {}, HeaderUtils: { extractForwardHeaders: () => ({}) }, SearchClient: class { async webSearch(query, count){searches++;assert.equal(query, 'fixture-query');assert.equal(count, 10);return {summary:'fixture-summary',web_items:[],image_items:[]};} } } }, {COZE_WORKLOAD_IDENTITY_API_KEY:'offline-test-fixture'});
  const response = await route.POST(request({query:'fixture-query'}, {authorization:'Bearer authenticated-fixture'}));
  assert.equal(response.status, 200);
  assert.equal(response.data.data.summary, 'fixture-summary');
  assert.equal(response.data.data.web_items.length, 0);
  assert.equal(response.data.data.image_items.length, 0);
  assert.equal(searches, 1);
});
