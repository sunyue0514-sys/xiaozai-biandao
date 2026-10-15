const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load,next,request}=require('./helpers/runtime.cjs');
const fs=require('node:fs');const path=require('node:path');
const authenticated={hasSession:async()=>true,getSessionUserId:async()=>7,getSessionUserInfo:async()=>({id:7,role:'user'})};
const env={COZE_WORKLOAD_IDENTITY_API_KEY:'offline-fixture-key'};
function dependencies(file, overrides={}) { const text=fs.readFileSync(path.join(__dirname,'..',file),'utf8');const mocks={...next,'coze-coding-dev-sdk':sdk,'@/lib/session':authenticated};for(const m of text.matchAll(/from ['"]([^'"]+)['"]/g))if(!(m[1] in mocks)&&m[1]!=='@/app/api/ai/_security'&&m[1]!=='@/app/api/ai/_fetch')mocks[m[1]]={};return {...mocks,...overrides}; }
const sdk={Config:class{},HeaderUtils:{extractForwardHeaders:()=>({})},LLMClient:class{constructor(){throw Error('SDK must not run');}},FetchClient:class{constructor(){throw Error('SDK must not run');}}};
for(const endpoint of ['account-analysis','banned-words','benchmark-analysis','humanize']) test('operations/'+endpoint+' rejects expired token before body/SDK',async()=>{
 const api=load('src/app/api/operations/'+endpoint+'/route.ts',{...next,'@/lib/session':{hasSession:async()=>false},'coze-coding-dev-sdk':sdk});
 let read=false;const req=request({}, {authorization:'Bearer expired'});req.json=async()=>{read=true;return {text:'test'};};
 assert.equal((await api.POST(req)).status,401);assert.equal(read,false);
});
test('account plan refuses a customer belonging to another user',async()=>{
 const file='src/app/api/account-planning/generate/route.ts';let charged=0;
 const api=load(file,dependencies(file,{'@/lib/db-store':{getCustomerById:async()=>({id:12,uid:'8'})},'@/lib/power':{consumePower:async()=>{charged++;return {success:true};},refundPower:async()=>{} }}),env);
 const res=await api.POST(request({customerId:12,surveyAnswers:{}},{authorization:'Bearer fixture'}));assert.equal(res.status,404);
});
test('background process refuses another owners video even if body claims admin',async()=>{
 const file='src/app/api/inspiration-cocreate/process/route.ts';let writes=0;
 const api=load(file,dependencies(file,{'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {select(){return this;},eq(){return this;},single:async()=>({data:{id:12,uploaded_by:8,video_url:'https://www.douyin.com/video/1'},error:null}),update(){writes++;return this;}};}})},'@/lib/video-parser':{detectPlatform:()=>{throw Error('must not parse foreign video');}}}),env);
 const res=await api.POST(request({videoId:12,url:'https://www.douyin.com/video/1',userId:7,isAdmin:true},{authorization:'Bearer fixture'}));assert.equal(res.status,404);assert.equal(writes,0);
});
test('competitor fetching requires authentication before SDK and URL access',async()=>{
 const api=load('src/app/api/analyze-competitor/route.ts',{...next,'coze-coding-dev-sdk':sdk,'@/lib/session':{hasSession:async()=>false}});
 const req=request();req.url='http://localhost/api/analyze-competitor?url=http://127.0.0.1';
 assert.equal((await api.GET(req)).status,401);
});
test('background process rejects forged admin body before parsing or database',async()=>{
 const api=load('src/app/api/inspiration-cocreate/process/route.ts',{...next,'@/lib/session':{hasSession:async()=>false},'@/storage/database/supabase-client':{getSupabaseClient(){throw Error('database must not run');}},'@/lib/video-parser':{},'@/lib/script-extractor':{}});
 let read=false;const req=request();req.json=async()=>{read=true;return {videoId:1,url:'http://127.0.0.1',userId:1,isAdmin:true};};
 assert.equal((await api.POST(req)).status,401);assert.equal(read,false);
});
for(const endpoint of ['search','web-search']) test(endpoint+' rejects oversized search count before SDK',async()=>{
 let spent=0;const api=load('src/app/api/'+endpoint+'/route.ts',{...next,'@/lib/session':{hasSession:async()=>true,getSessionUserId:async()=>7,getSessionUserInfo:async()=>({id:7})},'coze-coding-dev-sdk':{...sdk,SearchClient:class{async webSearch(){spent++;return {summary:'',web_items:[]};}}}},{COZE_WORKLOAD_IDENTITY_API_KEY:'fixture-config'});
 const res=await api.POST(request({query:'test',count:100000},{authorization:'Bearer session'}));assert.equal(res.status,400);assert.equal(spent,0);
});
test('creative generation scopes explicitly requested customer to authenticated owner',async()=>{
 const file='src/app/api/creative/sessions/[id]/generate/route.ts';const filters=[];
 const api=load(file,dependencies(file,{'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {select(){return this;},eq(k,v){filters.push([k,v]);return this;},single:async()=>({data:null,error:null})};}})},'@/lib/prompt-engineering':{buildContentSystemPrompt:()=>{throw Error('stop before paid SDK');}}}),env);
 await api.POST(request({customerId:12,saveToSession:false},{authorization:'Bearer fixture'}),{params:Promise.resolve({id:'1'})});
 assert.ok(filters.some(([k,v])=>k==='uid'&&v==='7'));
});
test('inspirations PUT rejects a foreign owner before mutation',async()=>{
 const file='src/app/api/inspirations/route.ts';let writes=0;
 const api=load(file,dependencies(file,{'@/lib/db-store':{getUserById:async()=>({id:7,uid:'70000007'}),getInspirationById:async()=>({id:12,uid:'80000008'}),updateInspiration:async()=>{writes++;return {id:12};}}}),env);
 const res=await api.PUT(request({id:12,content:'modified'},{authorization:'Bearer fixture'}));assert.equal(res.status,404);assert.equal(writes,0);
});
for(const endpoint of ['fetch-url','analyze-competitor']) test(endpoint+' refuses private target URLs before a paid fetch',async()=>{
 const file='src/app/api/'+endpoint+'/route.ts';let spent=0;
 const api=load(file,dependencies(file,{'coze-coding-dev-sdk':{...sdk,FetchClient:class{async fetch(){spent++;return {status_code:0,content:[]};}}}}),env);
 const req=request({url:'http://127.0.0.1/private'},{authorization:'Bearer fixture'});req.url='http://localhost/api/'+endpoint+'?url=http://127.0.0.1/private';
 const res=await api[endpoint==='analyze-competitor'?'GET':'POST'](req);assert.equal(res.status,400);assert.equal(spent,0);
});
test('video parsing refuses a deceptive platform substring URL before provider call',async()=>{
 const file='src/app/api/douyin/parse-video/route.ts';let spent=0;
 const api=load(file,dependencies(file,{'@/lib/video-parser':{parseShortVideo:async()=>{spent++;return {success:false,error:'fixture'};}}}),{...env,TIKHUB_API_KEY:'fixture-video-key'});
 const res=await api.POST(request({url:'https://attacker.example/?next=douyin.com'},{authorization:'Bearer fixture'}));assert.equal(res.status,400);assert.equal(spent,0);
});
test('video task polling claims pending work once before charging for concurrent requests',async()=>{
 const file='src/app/api/video/deep-analysis/status/[id]/route.ts';let charges=0,claimed=false;
 const api=load(file,dependencies(file,{'@/lib/db-store':{getVideoAnalysisHistoryById:async()=>({id:12,userId:7,status:'pending',videoUrl:'https://www.douyin.com/video/1'}),updateVideoAnalysisTask:async()=>{},getUserById:async()=>({powerQuota:-1})},'@/lib/power':{consumePower:async()=>{charges++;return {success:true,consumed:0};},refundPower:async()=>{}},'@/lib/security':{checkAILimit:()=>({allowed:true})},'@/lib/video-parser':{parseShortVideo:async()=>({success:false})},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {update(){return this;},eq(){return this;},select(){return this;},single:async()=>{if(claimed)return {data:null};claimed=true;return {data:{id:12}};}};}})}}),env);
 await Promise.all([1,2].map(()=>api.GET(request({}, {authorization:'Bearer fixture'}),{params:Promise.resolve({id:'12'})})));
 assert.equal(charges,1);
});
test('scriptless generation reserves credits before provider and refuses failed reservation',async()=>{
 const file='src/app/api/scriptless/chat/route.ts';let reserved=0;
 const api=load(file,dependencies(file,{'@/lib/scriptless-store':{getConversationById:async()=>({id:1}),checkCreditsEnough:async()=>true,getMessagesByConversationId:async()=>[],addUserMessage:async()=>{},CREDIT_RULES:{CONTINUE_GENERATION:100}},'@/lib/power':{consumePower:async()=>{reserved++;return {success:false,error:'Insufficient credits'};}}}),env);
 const res=await api.POST(request({conversationId:1,message:'test'},{authorization:'Bearer fixture'}));assert.equal(res.status,403);assert.equal(reserved,1);
});
test('web content fetch refuses redirects into private addresses without a second connection',async()=>{
 const file='src/app/api/fetch-url/route.ts';let connections=0;
 const api=load(file,dependencies(file,{'node:dns/promises':{lookup:async()=>[{address:'93.184.216.34',family:4}]},'node:https':{get(url,opts,callback){connections++;const req={on(){return this;},destroy(){}};queueMicrotask(()=>callback({statusCode:302,headers:{location:'http://127.0.0.1/private'},resume(){},destroy(){}}));return req;}},'coze-coding-dev-sdk':{...sdk,FetchClient:class{async fetch(){return {status_code:0,content:[]};}}}}),env);
 const res=await api.POST(request({url:'https://example.com'},{authorization:'Bearer fixture'}));assert.equal(res.status,400);assert.equal(connections,1);
});
test('quick analysis refuses another users pending video cache',async()=>{
 const file='src/app/api/video/quick-analysis/route.ts';
 const api=load(file,dependencies(file,{'@/lib/security':{getClientIp:()=>'',isIpBlacklisted:()=>false,checkRateLimit:()=>({allowed:true}),checkAILimit:()=>({allowed:true}),RATE_LIMITS:{ai:{}}},'@/lib/power':{consumePower:async()=>({success:true})},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {select(){return this;},eq(){return this;},single:async()=>({data:{id:12,uploaded_by:8,status:'pending',quick_analysis_result:{analysis:{coreEssence:{},userPortrait:{}}}},error:null})};}})}}),env);
 const res=await api.POST(request({videoId:12,title:'test',likes:10},{authorization:'Bearer fixture'}));assert.equal(res.status,404);
});
test('quick analysis cannot overwrite another users shared video cache',async()=>{
 const file='src/app/api/video/quick-analysis/route.ts';const writes=[];let writing=false;
 const api=load(file,dependencies(file,{'coze-coding-dev-sdk':{...sdk,LLMClient:class{async *stream(){yield {content:'{}'};}}},'@/lib/security':{getClientIp:()=>'',isIpBlacklisted:()=>false,checkRateLimit:()=>({allowed:true}),checkAILimit:()=>({allowed:true}),RATE_LIMITS:{ai:{}}},'@/lib/power':{consumePower:async()=>({success:true})},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {select(){return this;},update(){writing=true;return this;},eq(k,v){if(writing)writes.push([k,v]);return this;},single:async()=>({data:{id:12,uploaded_by:8,status:'approved'},error:null})};}})}}),env);
 await api.POST(request({videoId:12,title:'test',likes:10,forceRefresh:true},{authorization:'Bearer fixture'}));assert.ok(writes.some(([k,v])=>k==='uploaded_by'&&v===7));
});
