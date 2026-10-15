const {test}=require('node:test');const assert=require('node:assert/strict');
const {load,next,request}=require('./helpers/runtime.cjs');
const policy=load('src/lib/api-policy.ts');
function boundary(session){return load('src/lib/api-boundary.ts',{...next,'@/lib/session':session,'@/lib/api-policy':policy});}
function req(path,method='GET',headers={}){return {...request({},headers),url:'https://app.example'+path,method};}
test('public exceptions are exact methods, unknown routes default private',()=>{
 assert.equal(policy.getApiPolicy('/api/auth/login','POST'),'public');
 assert.equal(policy.getApiPolicy('/api/auth/login','DELETE'),'user');
 assert.equal(policy.getApiPolicy('/api/new-expensive-route','POST'),'user');
 assert.equal(policy.getApiPolicy('/api/admin%2fusers','POST'),'admin');
 assert.equal(policy.getApiPolicy('/api/agent/materials','POST'),'secret');
 assert.equal(policy.getApiPolicy('/api/agent/materials','DELETE'),'user');
});
test('anonymous private API is refused without database access',async()=>{
 const api=boundary({getSessionUserInfo(){throw Error('Must not read database');}});
 assert.equal((await api.checkApiBoundary(req('/api/unknown','POST'))).status,401);
});
test('expired sessions are awaited and rejected',async()=>{
 const api=boundary({getSessionUserInfo:async()=>null});
 assert.equal((await api.checkApiBoundary(req('/api/materials','GET',{authorization:'Bearer fixture'}))).status,401);
});
test('ordinary users cannot cross admin boundary but admins can',async()=>{
 for(const role of ['user','admin','super_admin']){
  const api=boundary({getSessionUserInfo:async()=>({id:7,role,username:'fixture'})});
  const response=await api.checkApiBoundary(req('/api/admin/users','GET',{authorization:'Bearer fixture'}));
  if(role==='user')assert.equal(response.status,403);else assert.equal(response,null);
 }
});
test('cross-origin cookie writes are refused, same-origin writes proceed',async()=>{
 const api=boundary({getSessionUserInfo:async()=>({id:7,role:'user',username:'fixture'})});
 for(const origin of ['https://untrusted.example','https://app.example']){
  const request=req('/api/materials','POST',{origin});request.cookies.get=()=>({value:'fixture'});
  const response=await api.checkApiBoundary(request);
  if(origin.includes('untrusted'))assert.equal(response.status,403);else assert.equal(response,null);
 }
});
test('database authorization errors never expose provider details',async()=>{
 const api=boundary({getSessionUserInfo:async()=>{throw Error('PRIVATE-PROVIDER-DETAIL');}});
 const response=await api.checkApiBoundary(req('/api/materials','GET',{authorization:'Bearer fixture'}));
 assert.equal(response.status,503);assert.equal(JSON.stringify(response.data).includes('PRIVATE-PROVIDER-DETAIL'),false);
});
