const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load,next}=require('./helpers/runtime.cjs');
test('public health reports liveness without touching credentials or private tables',async()=>{const api=load('src/app/api/health/route.ts',{...next,'@/storage/database/supabase-client':{getSupabaseClient(){throw Error('private database details')}}});const r=await api.GET();assert.equal(r.status,200);assert.equal(r.data.status,'ok');assert.equal(r.data.database,'not_checked');assert.equal(JSON.stringify(r.data).includes('private'),false)});
