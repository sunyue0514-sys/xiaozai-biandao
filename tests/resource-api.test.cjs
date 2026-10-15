const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const ts=require(process.env.TEST_TYPESCRIPT_MODULE||'typescript');
const root=path.resolve(__dirname,'..');
function load(route,mocks={},globals={}) {
 const filename=path.join(root,'src/app/api',route,'route.ts');
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const testModule={exports:{}};
 const context={module:testModule,exports:testModule.exports,URL,Date,Math,Response,Request,Headers,TextEncoder,TextDecoder,ReadableStream,AbortSignal,process:{env:{}},global:{},console:{log(){},error(){},warn(){}},...globals,
  require(name){if(name==='next/server')return {NextResponse:{json:(data,opts={})=>({data,status:opts.status||200})}};if(name in mocks)return mocks[name];throw Error('Unexpected import '+name);}};
 vm.runInNewContext(code,context,{filename});return testModule.exports;
}
const request=(body={},token='fixture-token',url='https://test.invalid/')=>({url,json:async()=>body,cookies:{get(){}},headers:new Headers(token?{authorization:'Bearer '+token}:{})});
const user={id:7,uid:'public-uid-seven',role:'user',credits:10000,powerQuota:10000,usedPower:0,maxCustomers:3};
const session={hasSession:async()=>true,getSessionUserId:async()=>7,getSessionUserInfo:async()=>user,getSessionUser:async()=>user};
const security={checkRateLimit:()=>({allowed:true,resetTime:0}),RATE_LIMITS:{general:{},ai:{},sensitive:{}},createRateLimitResponse:()=>({status:429})};
const base={'@/lib/session':session,'@/lib/security':security};
const taskBody={customerId:21,customerName:'Fixture',contentTypes:['topic'],scriptType:'story',count:1,executeMode:'immediate'};

test('automation creation refuses a foreign customer before credit writes',async()=>{
 let writes=0;
 const route=load('automation/create',{...base,'@/lib/store':{getUserById:async()=>user,getCustomerById:async()=>({id:21,uid:'8'}),updateUser:async()=>{writes++;return user;}}});
 const response=await route.POST(request(taskBody));assert.equal(response.status,404);assert.equal(writes,0);
});
test('automation creation rejects negative, fractional and excessive counts without credit writes',async()=>{
 for(const count of [-1,1.5,1000000,'2']){
  let writes=0;
  const route=load('automation/create',{...base,'@/lib/store':{getUserById:async()=>user,getCustomerById:async()=>({id:21,uid:'7'}),updateUser:async()=>{writes++;return user;}}});
  const response=await route.POST(request({...taskBody,count}));assert.equal(response.status,400);assert.equal(writes,0);
 }
});
test('product positioning verifies ownership before charging credits',async()=>{
 let charges=0;
 const route=load('product-profiles/positioning',{...base,'@/lib/power':{consumePower:async()=>{charges++;return {success:true,consumed:500};},refundPower:async()=>{}},'@/lib/db-store':{getProductProfileById:async()=>({id:21,uid:'8'}),updateProductProfile:async()=>{}},'coze-coding-dev-sdk':{}});
 assert.equal((await route.POST(request({productProfileId:21}))).status,404);assert.equal(charges,0);
});
test('feedback administration rejects ordinary users before obtaining domain database client',async()=>{
 let clients=0;
 const route=load('feedback',{...base,'@/lib/permissions':{isSuperAdmin:()=>false},'@/storage/database/supabase-client':{getSupabaseClient(){clients++;return {from(){return {select(){return this;},eq(){return this;},single:async()=>({data:{uid:user.uid,role:'user'}})};}};}}});
 assert.equal((await route.GET(request())).status,403);assert.equal(clients,0);
});
test('automation execution rejects a running task without starting another upstream request',async()=>{
 let upstream=0;
 const task={...taskBody,userId:'7',status:'running'};
 const route=load('automation/execute',{...base,'@/lib/store':{getUserById:async()=>user,getCustomerById:async()=>({id:21,uid:'7'}),updateUser:async()=>user}},{global:{automationTasks:new Map([['fixture-task',task]])},fetch:()=>{upstream++;return new Promise(()=>{});}});
 assert.equal((await route.POST(request({taskId:'fixture-task'}))).status,409);assert.equal(upstream,0);
});
test('memory performance refuses another user material before saving or invoking AI',async()=>{
 let writes=0,analyses=0;
 const route=load('memory/performance',{...base,'@/lib/db-store':{getMaterialById:async()=>({id:21,uid:'8'}),getCustomerById:async()=>({id:31,uid:'7'})},'@/lib/memory-system/db':{createPerformance:async()=>{writes++;return {id:1};},getPerformancesByUid:async()=>[],updatePerformance:async()=>{}},'@/lib/memory-system/analyzer':{analyzeHitFactors:async()=>{analyses++;return {};}}});
 const response=await route.POST(request({materialId:21,platform:'fixture',viewCount:1,likeCount:1}));
 assert.equal(response.status,404);assert.equal(writes,0);assert.equal(analyses,0);
});
test('memory performance update strips ownership, status and AI result mass assignment',async()=>{
 let saved;
 const route=load('memory/performance',{...base,'@/lib/db-store':{getMaterialById:async()=>({id:21,uid:'7'}),getCustomerById:async()=>({id:31,uid:'7'})},'@/lib/memory-system/db':{createPerformance:async()=>({}),getPerformancesByUid:async()=>[],updatePerformance:async(_id,uid,updates)=>{saved={uid,updates};return {}; }},'@/lib/memory-system/analyzer':{}});
 assert.equal((await route.PATCH(request({id:1,uid:'8',user_id:8,is_hit:true,hit_score:100,viewCount:50}))).status,200);
 assert.equal(saved.uid,'7');assert.equal(saved.updates.uid,undefined);assert.equal(saved.updates.user_id,undefined);assert.equal(saved.updates.is_hit,undefined);assert.equal(saved.updates.hit_score,undefined);
});

const scope=['customer','product-profiles','materials','automation','feedback','generation-stats','stats','device','login-records','onboarding','knowledge','memory'];
function routeMethods(){
 const found=[];
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())walk(full);else if(item.name==='route.ts'){
  const file=path.relative(path.join(root,'src/app/api'),path.dirname(full)).replaceAll('\\','/');
  const ast=ts.createSourceFile(full,fs.readFileSync(full,'utf8'),ts.ScriptTarget.Latest,true);
  for(const statement of ast.statements)if(ts.isFunctionDeclaration(statement)&&statement.name&&statement.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&['GET','POST','PUT','PATCH','DELETE'].includes(statement.name.text))found.push([file,statement.name.text]);
 }}}
 for(const name of scope)walk(path.join(root,'src/app/api',name));return found;
}
for(const [file,method] of routeMethods()) {
 for(const state of ['anonymous','expired','deleted']) {
  test(`${file} ${method} rejects ${state} callers before body, domain storage or SDK`,async()=>{
   let domainCalls=0,bodyReads=0;
   const forbidden=new Proxy({}, {get(){return ()=>{domainCalls++;throw Error('Domain work before authentication');};}});
   const mockSession={...session,hasSession:async()=>state!=='expired',getSessionUserInfo:async()=>state==='deleted'?null:user,getSessionUser:async()=>state==='deleted'?null:user};
   const modules=['@/lib/store','@/lib/db-store','@/lib/power','@/storage/database/supabase-client','coze-coding-dev-sdk','@/lib/memory-system/db','@/lib/memory-system/analyzer','@/lib/memory-system/enhancer','@/lib/memory-system/memory-helper','@/lib/security','@/lib/api'];
   const mocks=Object.fromEntries(modules.map(name=>[name,forbidden]));mocks['@/lib/session']=mockSession;mocks['@/lib/permissions']={isSuperAdmin:()=>false};
   const route=load(file,mocks);
   const req=request({},state==='anonymous'?null:'fixture-token');req.json=async()=>{bodyReads++;return {};};
   const result=await route[method](req,{params:Promise.resolve({id:'1'})});
   assert.equal(result.status,401);assert.equal(bodyReads,0);assert.equal(domainCalls,0);
  });
 }
}
test('automation execution fails closed for an owned pending draft without mutation or upstream access',async()=>{
 const draft={...taskBody,userId:'7',status:'pending',powerConsumed:0};let upstream=0;
 const route=load('automation/execute',base,{global:{automationTasks:new Map([['fixture-task',draft]])},fetch:()=>{upstream++;throw Error('Forbidden upstream');}});
 const response=await route.POST(request({taskId:'fixture-task',userId:8}));
 assert.equal(response.status,503);assert.equal(draft.status,'pending');assert.equal(draft.powerConsumed,0);assert.equal(upstream,0);
});
test('automation owned draft is saved with no debit and untrusted customer metadata is replaced',async()=>{
 let writes=0;const store=new Map();
 const route=load('automation/create',{...base,'@/lib/store':{getUserById:async()=>user,getCustomerById:async()=>({id:21,uid:'7',name:'Owned fixture',ipPositioning:'owned position'}),updateUser:async()=>{writes++;return user;}}},{global:{automationTasks:store}});
 const response=await route.POST(request({...taskBody,userId:8,customerName:'Other tenant',ipPositioning:'Untrusted positioning'}));
 assert.equal(response.status,200);assert.equal(writes,0);assert.equal(response.data.powerConsumed,0);assert.equal(response.data.executionAvailable,false);
 const task=[...store.values()][0];assert.equal(task.userId,'7');assert.equal(task.customerName,'Owned fixture');assert.equal(task.ipPositioning,'owned position');assert.equal(task.status,'pending');
});
test('onboarding reward claim fails closed before any reward or balance storage',async()=>{
 let calls=0;
 const route=load('onboarding/claim-reward',{...base,'@/storage/database/supabase-client':{getSupabaseClient(){calls++;throw Error('Forbidden database write');}}});
 const response=await route.POST(request({userId:8}));assert.equal(response.status,503);assert.equal(calls,0);assert.equal(response.data.rewardsAvailable,false);
});
test('knowledge search cannot use unrestricted datasets when server scope is missing',async()=>{
 let calls=0;
 const route=load('knowledge/search',{...base,'coze-coding-dev-sdk':{Config:class{},KnowledgeClient:class{constructor(){calls++;}},HeaderUtils:{}}});
 assert.equal((await route.POST(request({query:'fixture',dataset:'private',topK:5}))).status,503);assert.equal(calls,0);
});
test('knowledge import rejects an ordinary user before SDK creation',async()=>{
 let calls=0;
 const route=load('knowledge/import',{...base,'@/lib/permissions':{isSuperAdmin:()=>false},'coze-coding-dev-sdk':{KnowledgeClient:class{constructor(){calls++;}},Config:class{},HeaderUtils:{},DataSourceType:{TEXT:'text'}}});
 assert.equal((await route.POST(request())).status,403);assert.equal(calls,0);
});
test('public success cases use display flag, bounded query and explicit public fields',async()=>{
 const seen=[];
 const data=[{id:1,user_nickname:'Fixture',is_displayed:true,user_id:9,email:'private@example.invalid',case_data:{value:'100',unit:'views',secret:'private'},sort_order:0}];
 const query={select(fields){seen.push(['select',fields]);return this;},eq(key,value){seen.push([key,value]);return this;},order(){return this;},limit(value){seen.push(['limit',value]);return this;},then(resolve){resolve({data,error:null});}};
 const route=load('success-cases',{'@/storage/database/supabase-client':{getSupabaseClient:()=>({from:()=>query})}});
 const response=await route.GET();assert.equal(response.status,200);assert.ok(seen.some(([key,val])=>key==='is_displayed'&&val===true));assert.ok(seen.some(([key,val])=>key==='limit'&&val===20));
 assert.ok(seen.some(([key,val])=>key==='select'&&val!=='*'));assert.equal(response.data.data[0].user_id,undefined);assert.equal(response.data.data[0].email,undefined);assert.equal(response.data.data[0].case_data.secret,undefined);
});
for(const [file,method,getter,mutation] of [
 ['customer/update','POST','getCustomerById','updateCustomer'],
 ['product-profiles','PUT','getProductProfileById','updateProductProfile'],
 ['materials','PUT','getMaterialById','updateMaterial'],
 ['customer/materials','PUT','getMaterialById','updateMaterial'],
]) {
 test(`${file} ${method} blocks other owners and strips actor overrides on owned updates`,async()=>{
  for(const owner of ['8','7']){
   let written;
   const db={[getter]:async()=>({id:1,uid:owner}),[mutation]:async(_id,data)=>{written=data;return data;}};
   const route=load(file,{...base,'@/lib/store':db,'@/lib/db-store':db});
   const response=await route[method](request({id:1,uid:'8',userId:8,user_id:8,role:'admin',name:'Fixture',title:'Fixture'}));
   assert.ok(owner==='8'?[403,404].includes(response.status):response.status===200);
   if(owner==='8')assert.equal(written,undefined);
   else {assert.equal(written.uid,undefined);assert.equal(written.userId,undefined);assert.equal(written.user_id,undefined);assert.equal(written.role,undefined);}
  }
 });
}
for(const [file,method] of [['materials','GET'],['customer/materials','GET'],['customer/list','GET'],['product-profiles','GET'],['stats/creations','GET'],['device/list','GET'],['login-records','GET']]) {
 test(`${file} ${method} scopes list to database session ID despite request actor overrides`,async()=>{
  const calls=[];const get=async uid=>{calls.push(uid);return [];};
  const db={getMaterialsByUid:get,getCustomersByUid:get,getProductProfilesByUid:get,getDevicesByUid:get,getLoginRecordsByUid:get};
  const route=load(file,{...base,'@/lib/store':db,'@/lib/db-store':db});
  const response=await route[method](request({userId:8,uid:'8'},'fixture-token','https://test.invalid/?userId=8&uid=8'));
  assert.equal(response.status,200);assert.equal(calls.length,1);assert.equal(calls[0],'7');
 });
}
test('product positioning rate denial precedes credit debit and SDK creation',async()=>{
 let charges=0,sdk=0;
 const route=load('product-profiles/positioning',{...base,'@/lib/security':{...security,checkRateLimit:()=>({allowed:false,resetTime:1})},'@/lib/power':{consumePower:async()=>{charges++;return {success:true};},refundPower:async()=>{}},'@/lib/db-store':{getProductProfileById:async()=>({uid:'7'})},'coze-coding-dev-sdk':{Config:class{constructor(){sdk++;}}}});
 assert.equal((await route.POST(request({productProfileId:1}))).status,429);assert.equal(charges,0);assert.equal(sdk,0);
});
test('product positioning refunds exactly once if SDK initialization fails after owned debit',async()=>{
 const refunds=[];
 const route=load('product-profiles/positioning',{...base,'@/lib/power':{consumePower:async(id)=>{assert.equal(id,7);return {success:true,consumed:500};},refundPower:async(id,amount)=>refunds.push([id,amount])},'@/lib/db-store':{getProductProfileById:async()=>({uid:'7'})},'coze-coding-dev-sdk':{Config:class{constructor(){throw Error('Synthetic SDK failure');}}}});
 assert.equal((await route.POST(request({productProfileId:1,userId:8}))).status,500);assert.deepEqual(refunds,[[7,500]]);
});
test('knowledge search uses only server configured dataset names and caps topK',async()=>{
 const calls=[];const client=class{async search(...args){calls.push(args);return {code:0,chunks:[]};}};
 const route=load('knowledge/search',{...base,'coze-coding-dev-sdk':{Config:class{},KnowledgeClient:client,HeaderUtils:{}}},{process:{env:{KNOWLEDGE_PUBLIC_DATASETS:'public_fixture'}}});
 assert.equal((await route.POST(request({query:'fixture',topK:5,datasets:['private_dataset']}))).status,200);assert.equal(calls.length,1);assert.equal(calls[0][1].length,1);assert.equal(calls[0][1][0],'public_fixture');
 assert.equal((await route.POST(request({query:'fixture',topK:1000000}))).status,400);assert.equal(calls.length,1);
});
test('onboarding completion records own progress but never issues balances or invitation rewards',async()=>{
 const tables=[],writes=[];
 const db={from(table){tables.push(table);return {select(){return this;},eq(){return this;},single:async()=>({data:table==='onboarding_tasks'?{task_key:'save_material',reward_power:1000,reward_valid_days:7}:null}),upsert(data){writes.push([table,data]);return this;},then(resolve){resolve({error:null,data:[]});}};}};
 const route=load('onboarding/complete',{...base,'@/storage/database/supabase-client':{getSupabaseClient:()=>db}});
 const response=await route.POST(request({taskKey:'save_material',userId:8}));assert.equal(response.status,200);assert.equal(response.data.data.rewardsAvailable,false);assert.equal(response.data.data.reward,null);assert.equal(response.data.data.inviteReward,null);
 assert.ok(tables.every(name=>['onboarding_tasks','user_onboarding_progress'].includes(name)));assert.equal(writes[0][1].user_id,7);
});
test('memory PATCH uses the actual storage helper with atomic owner predicate and mapped columns',async()=>{
 const {load:loadSource}=require('./helpers/runtime.cjs');
 for(const owner of ['7','8']) {
  const filters=[],changes=[];
  const row={id:1,uid:owner,view_count:1,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};
  const client={from(){return {update(data){changes.push(data);return this;},eq(key,value){filters.push([key,value]);return this;},select(){return this;},single:async()=>filters.every(([key,value])=>row[key]===value)?{data:{...row,...changes[0]},error:null}:{data:null,error:{code:'PGRST116'}}};}};
  const db=loadSource('src/lib/memory-system/db.ts',{'@/storage/database/supabase-client':{getSupabaseClient:()=>client,waitForSequenceCheck:async()=>{}}});
  const route=load('memory/performance',{...base,'@/lib/db-store':{},'@/lib/memory-system/db':db,'@/lib/memory-system/analyzer':{}});
  const response=await route.PATCH(request({id:1,uid:'8',is_hit:true,viewCount:50}));
  assert.equal(response.status,owner==='7'?200:404);assert.ok(filters.some(([key,value])=>key==='uid'&&value==='7'));
  assert.equal(changes[0].uid,undefined);assert.equal(changes[0].is_hit,undefined);assert.equal(changes[0].viewCount,undefined);assert.equal(changes[0].view_count,50);
 }
});
