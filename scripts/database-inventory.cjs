// Offline inventory: prints identifiers only, never values or environment files.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(process.env.TEST_TYPESCRIPT_MODULE || 'typescript');
const tables = {};
function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir,e.name);
    if(e.isDirectory()) walk(p);
    else if(/\.tsx?$/.test(p)) inspect(p);
  }
}
function inspect(p) {
  const ast=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true);
  const froms=[];
  function visit(n) {
    if(ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text==='from' && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) froms.push(n);
    ts.forEachChild(n,visit);
  }
  visit(ast);
  for(const n of froms) {
    const table=n.arguments[0].text;
    const item=tables[table] ||= {files:new Set(),columns:new Set(),writes:new Set()};
    item.files.add(path.relative(root,p).replaceAll('\\','/'));
    let top=n;
    while(top.parent && (ts.isPropertyAccessExpression(top.parent)||ts.isCallExpression(top.parent))) top=top.parent;
    function scan(x) {
      if(ts.isCallExpression(x)&&ts.isPropertyAccessExpression(x.expression)) {
        const method=x.expression.name.text,a=x.arguments[0];
        if(a&&ts.isStringLiteral(a)&&['eq','neq','in','is','order','gte','lte','gt','lt','ilike','like'].includes(method)) item.columns.add(a.text);
        if(a&&ts.isStringLiteral(a)&&method==='select') {
          const plain=a.text.replace(/\([^()]*\)/g,'');
          for(const col of plain.split(',')) if(/^[a-z_]+$/.test(col.trim())) item.columns.add(col.trim());
        }
        if(a&&['insert','upsert','update'].includes(method)) {
          const record=obj=>{if(ts.isObjectLiteralExpression(obj))for(const prop of obj.properties)if(prop.name && prop.name.text){item.columns.add(prop.name.text);item.writes.add(prop.name.text);}};
          record(a);
          if(ts.isArrayLiteralExpression(a)) for(const el of a.elements)record(el);
          if(ts.isIdentifier(a)) {
            // Resolve payload assembly only inside the containing function, avoiding
            // unrelated updateData variables used for other tables in the same file.
            let scope=x;while(scope.parent&&!ts.isFunctionLike(scope))scope=scope.parent;
            function resolve(v){
              if(ts.isVariableDeclaration(v)&&ts.isIdentifier(v.name)&&v.name.text===a.text&&v.initializer)record(v.initializer);
              if(ts.isBinaryExpression(v)&&v.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isPropertyAccessExpression(v.left)&&ts.isIdentifier(v.left.expression)&&v.left.expression.text===a.text){item.columns.add(v.left.name.text);item.writes.add(v.left.name.text);}
              ts.forEachChild(v,resolve);
            }
            resolve(scope);
          }
        }
      }
      ts.forEachChild(x,scan);
    }
    scan(top);
  }
}
walk(path.join(root,'src'));
const output=Object.fromEntries(Object.entries(tables).sort().map(([k,v])=>[k,{files:[...v.files].sort(),columns:[...v.columns].sort(),writes:[...v.writes].sort()}]));
if(require.main===module) process.stdout.write(JSON.stringify(output,null,2));
module.exports=output;
