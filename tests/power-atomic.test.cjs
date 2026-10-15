const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./helpers/runtime.cjs');
function setup(conflict=false){
 let row={id:1,credits:100,used_power:5,power_quota:100,power_expiry:null},writes=0;
 const client={from(){let update,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},update(v){update=v;return q},async single(){return {data:{...row},error:null}},async maybeSingle(){writes++;if(conflict||!filters.every(([k,v])=>row[k]===v))return {data:null,error:null};row={...row,...update};return {data:{...row},error:null}}};return q}};
 const api=load('src/lib/power.ts',{'@/storage/database/supabase-client':{getSupabaseClient:()=>client}});
 return {api,get row(){return row},get writes(){return writes}};
}
test('deduction updates balance and usage together and confirms the returned row',async()=>{const s=setup();const r=await s.api.deductUserCredits(1,25,'chat');assert.equal(r.success,true);assert.equal(s.row.credits,75);assert.equal(s.row.used_power,30);assert.equal(s.writes,1)});
test('stale balance update fails closed',async()=>{const s=setup(true);const r=await s.api.deductUserCredits(1,25,'chat');assert.equal(r.success,false);assert.equal(r.consumed,0);assert.equal(s.row.credits,100)});
test('invalid amounts cannot create credits',async()=>{for(const amount of [-1,NaN,Infinity,0.5]){const s=setup();assert.equal((await s.api.deductUserCredits(1,amount,'chat')).success,false);assert.equal(s.writes,0)}});
test('unreceipted refunds fail closed without writing balance',async()=>{const s=setup();assert.equal((await s.api.refundPower(1,25,'retry')).success,false);assert.equal(s.writes,0)});
test('concurrent deductions cannot both spend the same snapshot',async()=>{const s=setup();const results=await Promise.all([s.api.deductUserCredits(1,75,'chat'),s.api.deductUserCredits(1,75,'chat')]);assert.equal(results.filter(r=>r.success).length,1);assert.equal(s.row.credits,25);assert.equal(s.row.used_power,80)});
test('unknown pricing and negative or nonfinite character counts fail closed',async()=>{const s=setup();for(const [feature,count] of [['missing',1],['chat',-1],['chat',Infinity]]){assert.equal((await s.api.checkAndConsumePower(1,feature,count)).success,false)}assert.equal(s.writes,0)});
