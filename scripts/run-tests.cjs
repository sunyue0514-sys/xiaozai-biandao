const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const files=fs.readdirSync(path.join(root,'tests'))
  .filter(name=>name.endsWith('.test.cjs')).sort().map(name=>path.join(root,'tests',name));
if(!files.length)throw Error('No tests found.');
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exitCode=result.status===null?1:result.status;
