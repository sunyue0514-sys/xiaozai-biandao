const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.TEST_TYPESCRIPT_MODULE || 'typescript');
const root = path.resolve(__dirname, '../..');
function load(file, mocks = {}, env = {}) {
  const filename = path.join(root, file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const exports={};
  const sandbox={exports,module:{exports},process:{env},Buffer,Date,URL,Headers,Request,Response,TextEncoder,TextDecoder,ReadableStream,AbortController,FormData,Blob,setTimeout:mocks.__setTimeout||setTimeout,clearTimeout,
    setImmediate(){},setInterval(){return {unref(){}}},console:mocks.__console||{log(){},warn(){},error(){}},
    require(name){if(name in mocks)return mocks[name];if(name==='@/app/api/ai/_fetch')return load('src/app/api/ai/_fetch.ts',mocks,env);if(name==='@/app/api/ai/_security'||name==='./_security')return load('src/app/api/ai/_security.ts',mocks,env);if(name.startsWith('node:')||['path','crypto','fs'].includes(name))return require(name);throw Error('Unexpected import '+name);}};
  sandbox.global=sandbox;
  vm.runInNewContext(output,sandbox,{filename});
  return exports;
}
const next={'next/server':{NextResponse:{json(data,options={}){return {status:options.status||200,data,cookies:{set(){}}};}}}};
const request=(body={},headers={})=>({json:async()=>body,url:'http://localhost/api/creative/sessions',cookies:{get:()=>undefined},headers:{get:name=>headers[name.toLowerCase()]||null}});
module.exports={load,next,request,root};
