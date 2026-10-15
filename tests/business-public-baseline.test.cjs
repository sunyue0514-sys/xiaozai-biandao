const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load, next, request } = require('./helpers/runtime.cjs');
const actor = { id: 7, uid: '10000001', username: 'fixture', role: 'user', credits: 100, powerQuota: 100, usedPower: 0 };
const session = { hasSession: async () => true, getSessionUserId: async () => actor.id, getSessionUser: async () => actor, getSessionUserInfo: async () => actor };
const security = { getClientIp: () => '127.0.0.1', isIpBlacklisted: () => false, checkRateLimit: () => ({ allowed: true }), RATE_LIMITS: { admin: {} } };
test('power consumption never trusts negative request costs to mint credits', async () => {
  let writes = 0;
  const route = load('src/app/api/power/consume/route.ts', { ...next, '@/lib/session': session, '@/lib/store': { getUserById: async () => actor, updateUser: async () => { writes++; } } });
  const response = await route.POST(request({ action: 'chat', estimatedCost: -100 }, { authorization: 'Bearer fixture' }));
  assert.equal(response.status, 400); assert.equal(writes, 0);
});
test('expired menu permissions session is rejected', async () => {
  const route = load('src/app/api/user/menu-permissions/route.ts', { ...next, '@/lib/session': { hasSession: async () => false } });
  assert.equal((await route.GET(request({}, { authorization: 'Bearer expired-fixture' }))).status, 401);
});
test('logout awaits session deletion and fails safely if deletion fails', async () => {
  const route = load('src/app/api/auth/logout/route.ts', { 'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200, cookies: { delete(){} } }) } }, '@/lib/session': { deleteSession: () => { const failure = Promise.reject(Error('fixture deletion failed')); failure.catch(() => {}); return failure; } } });
  assert.equal((await route.POST(request({}, { authorization: 'Bearer fixture' }))).status, 500);
});
for (const name of ['agent-stats', 'agents', 'agents/consumption', 'database-monitor', 'export', 'operation-logs', 'security', 'settlements', 'users', 'users/search']) {
  test('admin/' + name + ' rejects normal role even with legacy privileged UID', async () => {
    const client = { from(table){ return { select(){return this;}, eq(){return this;}, single: async () => ({ data: table === 'users' ? actor : { id: 4, user_id: 7, agent_level: 0, status: 'active' } }), maybeSingle: async () => ({data:actor}) }; } };
    const users = { getUserById: async () => actor };
    const route = load('src/app/api/admin/' + name + '/route.ts', { ...next, '@/lib/session': session, '@/lib/store': users, '@/lib/db-store': users, '@/lib/security': security, '@/storage/database/supabase-client': { getSupabaseClient: () => client }, '@/lib/permissions': { SUPER_ADMIN_UIDS: ['10000001'], isSuperAdmin: () => true, getEffectiveRole: () => 'super_admin' } });
    assert.equal((await route.GET(request({}, { authorization: 'Bearer fixture' }))).status, 403);
  });
}
for (const name of ['agent/commission', 'agent/create-user', 'agent/points', 'agent/settlements', 'admin/settlements', 'redemption/generate', 'redemption/redeem']) {
  test(name + ' financial legacy write is fail-closed without any mutation', async () => {
    let writes = 0;
    const privileged = { ...actor, role: 'super_admin', uid: '70000007' };
    const agent = { id: 4, userId: 7, status: 'active', agentLevel: 0, canCreateUser: true, canCreateCode: true, pendingAmount: 1000, pointsBalance: 10000 };
    const mutation = async () => { writes++; return { success: true }; };
    const client = { from(){ const q={}; for(const key of ['select','eq','order','limit','in','update','insert','delete'])q[key]=()=>{if(['update','insert','delete'].includes(key))writes++;return q;};q.single=async()=>({data:privileged,error:null});q.then=resolve=>resolve({data:[{id:1,code:'fixture'}],error:null});return q; } };
    const route=load('src/app/api/'+name+'/route.ts', { ...next, '@/lib/session': { ...session, getSessionUser: async () => privileged, getSessionUserInfo: async () => privileged }, '@/lib/store': {getUserById: async()=>privileged}, '@/lib/db-store': { getUserById: async()=>privileged, getAgentAccountByUserId: async()=>agent, updateAgentAccount: mutation, createAgentSettlement: mutation, updateAgentStats: mutation, createOperationLog: mutation, redeemRedemptionCode: mutation, updateUser: mutation }, '@/storage/database/supabase-client':{getSupabaseClient:()=>client}, '@/lib/permissions': { isSuperAdmin: ()=>false, getEffectiveRole:()=> 'super_admin' }, '@/lib/points-config': {POINTS_COST:{power_10000:29},CODE_TYPE_REWARDS:{power_10000:{days:365,power:10000}},getPointsCost:()=>29,canGenerateCodeType:()=>true}, '@/lib/points-service':{rechargeAgentPoints:mutation,allocatePoints:mutation,consumePoints:mutation}, '@/lib/password':{}, '@/lib/db-utils':{}, '@/lib/commission-calculator':{} });
    const response=await route.POST(request({ action:'recharge', agentId:4, points:100, count:1, type:'power_10000', code:'FIXTURE', amount:10, bankName:'fixture', bankAccount:'fixture', accountName:'fixture', username:'fixture_user',password:'fixture-password',codeType:'monthly',inviteeUid:'8',inviterUid:'7',orderId:'fixture',orderAmount:100 }, {authorization:'Bearer fixture'}));
    assert.equal(response.status,503);assert.equal(writes,0);
  });
}
for (const name of ['script', 'topic', 'writing']) {
  test('agent/' + name + ' blocks paid generation without a trustworthy usage ledger', async () => {
    let charged=false, sdk=false;
    const route=load('src/app/api/agent/'+name+'/route.ts',{...next,'@/lib/agent-auth':{verifyAgentRequest:async()=>({success:true,systemUserId:7,agentUser:{id:3}}),getApiKey:async()=>({id:4})},'@/lib/power':{consumePower:async()=>{charged=true;throw Error('must not charge');}},'coze-coding-dev-sdk':{Config:class{constructor(){sdk=true;}},HeaderUtils:{extractForwardHeaders:()=>({})}},'@/lib/system-prompts':{},'@/lib/prompt-engineering':{},'@/lib/prompt-builders':{}});
    const response=await route.POST(request({topic:'fixture',industry:'fixture'}, {'x-agent-api-key':'fixture','x-agent-user-id':'fixture','x-agent-timestamp':'fixture','x-agent-signature':'fixture'}));
    assert.equal(response.status,503);assert.equal(charged,false);assert.equal(sdk,false);
  });
}
for (const [role, body, expected] of [['admin',{credits:999},403],['super_admin',{credits:-100},400],['admin',{usedPower:0},403]]) {
  test('user quota write validates ' + role + ' ' + JSON.stringify(body), async () => {
    let writes=0;const operator={...actor,role,uid:'70000007'};
    const route=load('src/app/api/admin/users/route.ts',{...next,'@/lib/session':session,'@/lib/security':security,'@/lib/permissions':{},'@/lib/store':{getUserById:async id=>id===7?operator:{id:8,uid:'80000008',role:'user',inviterId:7,maxCustomers:10,maxDevices:1},updateUser:async()=>{writes++;return{id:8};},createOperationLog:async()=>{}}});
    assert.equal((await route.PUT(request({id:8,...body},{authorization:'Bearer fixture'}))).status,expected);assert.equal(writes,0);
  });
}
test('delegated admin user search never reveals unrelated owner',async()=>{
  const operator={...actor,role:'admin',uid:'70000007'};
  const route=load('src/app/api/admin/users/search/route.ts',{...next,'@/lib/session':{...session,getSessionUser:async()=>operator},'@/lib/permissions':{},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(table){return{select(){return this;},eq(){return this;},single:async()=>({data:table==='users'?{id:8,inviter_id:9}:null,error:null})};}})}});
  const req=request({}, {authorization:'Bearer fixture'});req.url='https://offline.invalid/?uid=fixture';assert.equal((await route.GET(req)).status,404);
});
test('signed material creation cannot reference a foreign customer',async()=>{
  let writes=0;const route=load('src/app/api/agent/materials/route.ts',{...next,'@/lib/agent-auth':{verifyAgentRequest:async()=>({success:true,systemUserId:7,agentUser:{id:3}}),getApiKey:async()=>({id:4}),logAgentCall:async()=>{}},'@/lib/db-store':{getCustomerById:async()=>({id:21,uid:'8'})},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return{insert(){writes++;return this;},select(){return this;},single:async()=>({data:{id:1},error:null})};}})}});
  const response=await route.POST(request({customerId:21,topic:'fixture'}, {'x-agent-api-key':'fixture','x-agent-user-id':'fixture','x-agent-timestamp':'fixture','x-agent-signature':'fixture'}));assert.equal(response.status,404);assert.equal(writes,0);
});
test('automatic destructive cleanup is unavailable even for a valid cron secret',async()=>{
  let accessed=false;const secret='X'.repeat(48);
  const route=load('src/app/api/admin/cleanup-expired-users/route.ts',{...next,'@/storage/database/supabase-client':{getSupabaseClient(){accessed=true;throw Error('no destructive database work');}}},{CRON_SECRET:secret});
  assert.equal((await route.POST(request({}, {authorization:'Bearer '+secret}))).status,503);assert.equal(accessed,false);
});
test('emergency reset never returns private database error details',async()=>{
  const secret='X'.repeat(48);
  const route=load('src/app/api/admin/emergency-reset/route.ts',{...next,'@/lib/password':{hashPassword:async()=> 'fixture-hash'},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:null,error:{message:'PRIVATE_FIXTURE_SCHEMA'}})};}})}},{EMERGENCY_ADMIN_KEY:secret});
  const response=await route.POST(request({adminKey:secret,username:'fixture',newPassword:'fixture-passphrase'}));assert.equal(response.status,500);assert.equal(JSON.stringify(response.data).includes('PRIVATE_FIXTURE_SCHEMA'),false);
});
