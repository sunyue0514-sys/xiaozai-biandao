const path=require('node:path');

// Windows restricted runners can fail concurrent output mkdir calls with EPERM.
// Serialize them, and recognize only directories already present under output.
// This never grants access, changes ACLs, or suppresses a missing-path denial.
function install(fileSystem,outputRoot) {
 const original=fileSystem.mkdir;
 const root=path.resolve(outputRoot);
 const pending=[];
 let active=false;
 function run(){
  if(active || !pending.length)return;
  active=true;
  const {context,args,callback,operation=original}=pending.shift();
  function complete(error,...rest){
   active=false;
   try{callback(error,...rest);}finally{run();}
  }
  args[args.length-1]=function(error,...rest){
   const relative=path.relative(root,path.resolve(String(args[0])));
   const inside=!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);
   if(!error || error.code!=='EPERM' || !inside)return complete(error,...rest);
   fileSystem.stat(args[0],(statError,stat)=>{
    if(!statError && stat.isDirectory()){
     if(args[1]?.recursive)return complete(null,...rest);
     error.code='EEXIST';
    }
    complete(error,...rest);
   });
  };
  try{operation.apply(context,args);}catch(error){complete(error);}
 }
 fileSystem.mkdir=function(...args){
  const callback=args[args.length-1];
  if(typeof callback!=='function')return original.apply(this,args);
  const relative=path.relative(root,path.resolve(String(args[0])));
  if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep))return original.apply(this,args);
  pending.push({context:this,args,callback});run();
 };
 if(fileSystem.promises){
  const promiseSystem=fileSystem.promises;
  const promiseMkdir=promiseSystem.mkdir;
  promiseSystem.mkdir=function(...args){
   const relative=path.relative(root,path.resolve(String(args[0])));
   if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep))return promiseMkdir.apply(this,args);
   return new Promise((resolve,reject)=>{
    const callback=(error,value)=>error?reject(error):resolve(value);
    const operation=function(...callArgs){
     const done=callArgs.pop();
     promiseMkdir.apply(promiseSystem,callArgs).then(value=>done(null,value),done);
    };
    pending.push({context:promiseSystem,args:[...args,callback],callback,operation});run();
   });
  };
 }
}
module.exports={install};

if(process.env.NEXT_BUILD_OUTPUT_ROOT)install(require('node:fs'),process.env.NEXT_BUILD_OUTPUT_ROOT);
