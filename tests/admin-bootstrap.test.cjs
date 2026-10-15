const {test}=require('node:test');const assert=require('node:assert/strict');
const {load}=require('./helpers/runtime.cjs');
test('bootstrap generates a separate password per installation and clears its temporary value',async()=>{
 const {runAdminBootstrap}=load('src/lib/admin-bootstrap.ts');
 const passwords=[];
 for(let i=0;i<2;i++){
  const env={},output=[];
  await runAdminBootstrap(async()=>{passwords.push(env.ADMIN_PASSWORD);return {created:true,username:'admin'};},env,s=>output.push(s));
  assert.equal(env.ADMIN_PASSWORD,undefined);assert.equal(output.filter(s=>s.includes(passwords[i])).length,1);
 }
 assert.match(passwords[0],/^[A-Za-z0-9_-]{32}$/);assert.notEqual(passwords[0],passwords[1]);
});
test('bootstrap never displays credentials when an existing account is retained',async()=>{
 const {runAdminBootstrap}=load('src/lib/admin-bootstrap.ts');const env={},output=[];let generated;
 await runAdminBootstrap(async()=>{generated=env.ADMIN_PASSWORD;return {created:false,username:'admin'};},env,s=>output.push(s));
 assert.equal(output.some(s=>s.includes(generated)),false);assert.equal(env.ADMIN_PASSWORD,undefined);
});
test('bootstrap preserves an operator-provided password without printing it',async()=>{
 const {runAdminBootstrap}=load('src/lib/admin-bootstrap.ts');const env={ADMIN_PASSWORD:'operator-private-password'},output=[];
 await runAdminBootstrap(async()=>({created:true,username:'admin'}),env,s=>output.push(s));
 assert.equal(env.ADMIN_PASSWORD,'operator-private-password');assert.equal(output.some(s=>s.includes(env.ADMIN_PASSWORD)),false);
});
test('failed bootstrap does not display or retain the generated password',async()=>{
 const {runAdminBootstrap}=load('src/lib/admin-bootstrap.ts');const env={},output=[];
 await assert.rejects(()=>runAdminBootstrap(async()=>{throw Error('Database unavailable');},env,s=>output.push(s)));
 assert.equal(env.ADMIN_PASSWORD,undefined);assert.equal(output.length,0);
});
