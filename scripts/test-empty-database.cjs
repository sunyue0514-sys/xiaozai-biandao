// Optional true PostgreSQL engine smoke test, entirely in memory. No network.
// Supply an installed @electric-sql/pglite entry point as the first argument,
// or install it in the test environment and omit the argument.
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
async function main(){
 const spec=process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : '@electric-sql/pglite';
 const {PGlite}=await import(spec);
 const db=new PGlite();
 const root=path.resolve(__dirname,'..');
 try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  const sql=fs.readFileSync(path.join(root,'sql/initialize-empty-test-database.sql'),'utf8');
  await db.exec(sql);
  await db.exec(fs.readFileSync(path.join(root,'tests/database-integration.sql'),'utf8'));
  const inventory=require('./database-inventory.cjs');
  for(const [table,contract] of Object.entries(inventory)) {
   const {rows}=await db.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['public',table]);
   assert.ok(rows.length,`Missing table ${table}`);
   const columns=new Set(rows.map(r=>r.column_name));
   for(const field of contract.columns)assert.ok(columns.has(field),`Missing ${table}.${field}`);
  }
  let rejected=false;
  try {await db.exec(sql);} catch(err){rejected=/public schema is not empty/.test(err.message);await db.exec('ROLLBACK');}
  assert.ok(rejected,'Second initialization must fail');
  const {rows}=await db.query("SELECT count(*)::int AS tables FROM pg_tables WHERE schemaname='public'");
  console.log(`PostgreSQL smoke passed: ${rows[0].tables} tables; service inserts, RPCs, upserts, frontend denials and repeat-init guard.`);
 } finally {await db.close();}
}
main().catch(err=>{console.error(`PostgreSQL smoke unavailable or failed: ${err.message}`);process.exitCode=1;});
