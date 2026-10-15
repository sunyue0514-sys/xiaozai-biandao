const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {install}=require('../scripts/existing-output-directories.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'build-directory-'));
const directory=path.join(root,'output');fs.mkdirSync(directory);
const file=path.join(root,'file');fs.writeFileSync(file,'fixture');
function call(target,code='EPERM'){
 return new Promise(resolve=>{
  const adapter={mkdir(_target,callback){callback(code ? Object.assign(new Error('fixture'),{code}) : null);},stat:fs.stat.bind(fs)};
  install(adapter,directory);
  adapter.mkdir(target,error=>resolve(error));
 });
}
test('existing build output directory accepts a concurrent mkdir collision',async()=>{
 assert.equal((await call(directory)).code,'EEXIST');
});
test('permission error for a missing output directory remains visible',async()=>{
 assert.equal((await call(path.join(directory,'missing'))).code,'EPERM');
});
test('permission errors outside output or targeting a file remain visible',async()=>{
 assert.equal((await call(root)).code,'EPERM');
 const outputFile=path.join(directory,'file');fs.writeFileSync(outputFile,'fixture');
 assert.equal((await call(outputFile)).code,'EPERM');
});
test('access denied errors remain visible even for existing directories',async()=>{
 assert.equal((await call(directory,'EACCES')).code,'EACCES');
});
test('successful mkdir callbacks remain successful',async()=>{
 assert.equal(await call(directory,null),null);
});
test('output mkdir operations run sequentially rather than colliding',async()=>{
 let active=0,maxActive=0;
 const adapter={mkdir(_target,callback){active++;maxActive=Math.max(maxActive,active);setImmediate(()=>{active--;callback(null);});},stat:fs.stat.bind(fs)};
 install(adapter,directory);
 await Promise.all(Array.from({length:30},()=>new Promise((resolve,reject)=>adapter.mkdir(directory,error=>error?reject(error):resolve()))));
 assert.equal(maxActive,1);
});
test('recursive promise mkdir accepts only an already existing output directory',async()=>{
 const adapter={mkdir:fs.mkdir.bind(fs),stat:fs.stat.bind(fs),promises:{mkdir:async()=>{throw Object.assign(new Error('fixture'),{code:'EPERM'});}}};
 install(adapter,directory);
 assert.equal(await adapter.promises.mkdir(directory,{recursive:true}),undefined);
 await assert.rejects(adapter.promises.mkdir(path.join(directory,'missing'),{recursive:true}),{code:'EPERM'});
 await assert.rejects(adapter.promises.mkdir(root,{recursive:true}),{code:'EPERM'});
});
test('callback and promise mkdir share a single operation queue',async()=>{
 let active=0,maxActive=0;
 const mark=()=>{active++;maxActive=Math.max(maxActive,active);};
 const adapter={mkdir(_target,callback){mark();setImmediate(()=>{active--;callback(null);});},stat:fs.stat.bind(fs),promises:{mkdir:async()=>{mark();await new Promise(resolve=>setImmediate(resolve));active--;}}};
 install(adapter,directory);
 await Promise.all(Array.from({length:30},(_,i)=>i%2?adapter.promises.mkdir(directory):new Promise((resolve,reject)=>adapter.mkdir(directory,error=>error?reject(error):resolve()))));
 assert.equal(maxActive,1);
});
