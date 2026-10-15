const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const preload=path.join(__dirname,'existing-output-directories.cjs');
const result=spawnSync(process.execPath,['--require',preload,require.resolve('next/dist/bin/next'),'build','--webpack'],{
 cwd:root,stdio:'inherit',env:{...process.env,NEXT_BUILD_OUTPUT_ROOT:path.join(root,'.next'),NEXT_WINDOWS_SERIAL_BUILD:'1'},
});
if(result.error){console.error(result.error.message);process.exitCode=1;}
else process.exitCode=result.status??1;
