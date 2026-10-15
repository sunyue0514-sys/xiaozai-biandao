const {test}=require('node:test');const assert=require('node:assert/strict');
const {load}=require('./helpers/runtime.cjs');
const sdk={dotenv:{config(){}},'@supabase/supabase-js':{createClient:(url,key)=>({url,key})},child_process:{execSync(){throw Error('No workload identity outside Coze');}}};
test('database client accepts standard server-only Supabase configuration',()=>{
 const api=load('src/storage/database/supabase-client.ts',sdk,{SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'server-test-only-key'});
 const client=api.getSupabaseClient();assert.equal(client.url,'https://example.supabase.co');assert.equal(client.key,'server-test-only-key');
});
test('database client does not accept public browser variables as server credentials',()=>{
 const api=load('src/storage/database/supabase-client.ts',sdk,{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_KEY:'public-test-key'});
 assert.throws(()=>api.getSupabaseClient());
});
test('resetting the client recreates it using updated private configuration',()=>{
 const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'first-test-key'};
 const api=load('src/storage/database/supabase-client.ts',sdk,env);const first=api.getSupabaseClient();env.SUPABASE_SECRET_KEY='second-test-key';api.resetSupabaseClient();
 assert.equal(api.getSupabaseClient().key,'second-test-key');assert.equal(first.key,'first-test-key');
});
