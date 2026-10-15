const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load,next,request}=require('./helpers/runtime.cjs');
const security={getClientIp:()=> '127.0.0.1',isIpBlacklisted:()=>false,checkRateLimit:()=>({allowed:true}),checkRegistrationLimit:()=>({allowed:true}),checkDailyRegistrationLimit:()=>({allowed:true}),checkDeviceRegistrationLimit:()=>({allowed:true}),recordRegistration(){},recordDeviceRegistration(){},RATE_LIMITS:{auth:{}},createRateLimitResponse(){},isLoginLocked:()=>({locked:false}),recordLoginFailure:()=>({remaining:3,locked:false}),clearLoginFailure(){}};
function signup(more={}){
 return load('src/app/api/auth/register/route.ts',{...next,'@/lib/security':security,
  '@/lib/store':{createUser:async()=>({id:7,uid:'U7',username:'demo',password:'HASH-SHOULD-NOT-LEAK'}),updateUser:async()=>{}},
  '@/lib/db-store':{},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {select(){return this;},eq(){return this;},single:async()=>({error:{message:'offline'},data:null})};}})},...more});
}
test('registration does not log the password or complete request body',async()=>{
 const logs=[];const route=signup({__console:{log:(...x)=>logs.push(x.join(' ')),warn(){},error(){}}});
 await route.POST(request({username:'demo',password:'PRIVATE-REG-PASS'}));
 assert.equal(logs.some(x=>x.includes('PRIVATE-REG-PASS')),false);
});
test('registration never returns password hash when final user lookup fails',async()=>{
 const response=await signup().POST(request({username:'demo',password:'long-enough-password'}));
 assert.equal(response.status,200);assert.equal('password' in response.data.data,false);
});
test('registration rejects non-string password before creating a user',async()=>{
 let created=false;const route=signup({'@/lib/store':{createUser:async()=>{created=true;return {error:'bad'};}}});
 const response=await route.POST(request({username:'demo',password:{length:20}}));
 assert.equal(response.status,400);assert.equal(created,false);
});
test('login verifies the original password including spaces',async()=>{
 let received;const route=load('src/app/api/auth/login/route.ts',{...next,'@/lib/security':security,
  '@/lib/store':{getUserByUsername:async()=>({id:7,password:'HASH'})},'@/lib/session':{},
  '@/lib/db-store':{createLoginRecord:async()=>{}},'@/lib/password':{isHashedPassword:()=>true,verifyPassword:async p=>{received=p;return false;}}});
 await route.POST(request({username:'demo',password:'  correct-password  '}));
 assert.equal(received,'  correct-password  ');
});
test('administrator bootstrap defaults to admin and persists a hash',async()=>{
 let row;const client={from(){return {select(){return this;},eq:async()=>({count:0,error:null}),insert:async value=>{row=value;return {error:null};}};}};
 const api=load('src/lib/db-store.ts',{'@/storage/database/supabase-client':{getSupabaseClient:()=>client},'@/lib/password':{hashPassword:async p=>'HASH:'+p,isHashedPassword:()=>false}},{ADMIN_PASSWORD:'private-long-password'});
 const result=await api.ensureDefaultAdmin();
 assert.equal(row.username,'admin');assert.equal(row.password,'HASH:private-long-password');assert.equal(result.created,true);
});
test('administrator bootstrap never overwrites an existing account',async()=>{
 let inserts=0;const client={from(){return {select(){return this;},eq:async()=>({count:1,error:null}),insert:async()=>{inserts++;return {error:null};}};}};
 const api=load('src/lib/db-store.ts',{'@/storage/database/supabase-client':{getSupabaseClient:()=>client},'@/lib/password':{}},{ADMIN_PASSWORD:'private-long-password'});
 const result=await api.ensureDefaultAdmin();assert.equal(result.created,false);assert.equal(inserts,0);
});
function changePassword(update){
 const events=[];
 const api=load('src/app/api/auth/change-password/route.ts',{...next,
  '@/lib/session':{hasSession:async()=>true,getSessionUser:async()=>({id:7,username:'demo'})},
  '@/lib/db-store':{getUserByUsername:async()=>({id:7,password:'HASH'}),updateUser:update,deleteSessionsByUserId:async id=>events.push(id)},
  '@/lib/password':{hashPassword:async()=> 'NEW-HASH',verifyPassword:async p=>p==='old-password'},
 });
 return {api,events};
}
test('password change never reports success when database update fails',async()=>{
 const {api}=changePassword(async()=>null);
 const response=await api.POST(request({currentPassword:'old-password',newPassword:'new-password'},{authorization:'Bearer test-session'}));
 assert.equal(response.status,500);
});
test('password change invalidates previously issued sessions',async()=>{
 const {api,events}=changePassword(async()=>({id:7}));
 const response=await api.POST(request({currentPassword:'old-password',newPassword:'new-password'},{authorization:'Bearer test-session'}));
 assert.equal(response.status,200);assert.deepEqual(events,[7]);
});
test('emergency password reset revokes all previous sessions',async()=>{
 let revoked=false;
 const client={from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{id:7,username:'demo'},error:null}),update:async()=>({error:null}),delete(){revoked=table==='sessions';return this;},then(resolve){resolve({error:null});}};}};
 const route=load('src/app/api/admin/emergency-reset/route.ts',{...next,'@/storage/database/supabase-client':{getSupabaseClient:()=>client},'@/lib/password':{hashPassword:async()=> 'NEW-HASH'}},{EMERGENCY_ADMIN_KEY:'unit-only-reset-key-with-32-characters'});
 // The user update must remain chainable as it is in the real SDK.
 const original=client.from;client.from=table=>{const q=original(table);q.update=function(){return this;};return q;};
 const response=await route.POST(request({adminKey:'unit-only-reset-key-with-32-characters',username:'demo',newPassword:'new-password'}));
 assert.equal(response.status,200);assert.equal(revoked,true);
});
