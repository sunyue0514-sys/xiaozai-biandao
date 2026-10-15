const {test}=require('node:test');const assert=require('node:assert/strict');
const {load,next,request}=require('./helpers/runtime.cjs');
function route(customer){
 const writes=[];const filters=[];
 const client={from(table){return {select(){return this;},eq(k,v){filters.push([table,k,v]);return this;},insert(v){writes.push(v);return this;},single:async()=>({data:{id:1},error:null}),maybeSingle:async()=>({data:customer,error:null})};}};
 const api=load('src/app/api/creative/sessions/route.ts',{...next,'@/lib/session':{hasSession:async()=>true,getSessionUserId:async()=>7},'@/storage/database/supabase-client':{getSupabaseClient:()=>client}});
 return {api,writes,filters};
}
test('creative session preserves an owned integer customer ID',async()=>{
 const {api,writes,filters}=route({id:12});
 const res=await api.POST(request({customerId:'12'},{authorization:'Bearer test-session'}));
 assert.equal(res.status,200);assert.equal(writes[0].customer_id,12);assert.ok(filters.some(x=>x[0]==='customers'&&x[1]==='uid'&&x[2]==='7'));
});
test('creative session rejects customer IDs owned by another user',async()=>{
 const {api,writes}=route(null);
 const res=await api.POST(request({customerId:12},{authorization:'Bearer test-session'}));
 assert.equal(res.status,404);assert.equal(writes.length,0);
});
test('creative session rejects malformed customer IDs rather than silently dropping them',async()=>{
 for(const customerId of ['12bad',{},-1,1.2]){
  const {api,writes}=route({id:12});const res=await api.POST(request({customerId},{authorization:'Bearer test-session'}));
  assert.equal(res.status,400);assert.equal(writes.length,0);
 }
});
test('creative record stores the generated script in the column required by the schema',async()=>{
 let write;
 const api=load('src/app/api/creative/records/route.ts',{...next,'@/lib/session':{hasSession:async()=>true,getSessionUserId:async()=>7},'@/storage/database/supabase-client':{getSupabaseClient:()=>({from(){return {insert(v){write=v;return this;},select(){return this;},single:async()=>({data:{id:1,version:1},error:null})};}})}});
 const res=await api.POST(request({topic:'Test script',result:'Generated script body'},{authorization:'Bearer test-session'}));
 assert.equal(res.status,200);assert.equal(write.script_content,'Generated script body');assert.equal('result' in write,false);
});
