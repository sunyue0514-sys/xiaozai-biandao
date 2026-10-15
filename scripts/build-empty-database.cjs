// Rebuild the reviewed baseline from checked-in schema sources plus explicit additions.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const parts = [
 'drizzle/0000_chemical_drax.sql',
 'sql/inspiration-cocreate.sql',
 'supabase/migrations/agent_distribution_system.sql',
 'supabase/migrations/008_ai_quality_tables.sql',
 'supabase/migrations/20260331000001_create_creative_records.sql',
 'supabase/migrations/20260401000001_enhance_creative_records.sql',
 'supabase/migrations/add_inspiration_processing_status.sql',
 'src/lib/memory-system/schema.sql',
];
let out = `-- EMPTY TEST DATABASE ONLY. Not an upgrade migration. See docs/DATABASE_INITIALIZATION.md.\nBEGIN;\nSET LOCAL search_path = public, pg_catalog;\nDO $$ BEGIN\n IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S','f')) OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')) THEN\n  RAISE EXCEPTION 'Refusing initialization: public schema is not empty';\n END IF;\n IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls) THEN\n  RAISE EXCEPTION 'Supabase service_role with BYPASSRLS is required';\n END IF;\n IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN\n  RAISE EXCEPTION 'Supabase API roles are required';\n END IF;\nEND $$;\n`;
for(const p of parts) {
 let sql=fs.readFileSync(path.join(root,p),'utf8').replace(/--[^\n]*/g,'').replace(/\n\s*\n/g,'\n');
 if(p.endsWith('add_inspiration_processing_status.sql')) sql=sql.slice(0,sql.indexOf('UPDATE inspiration_videos'));
 if(p.includes('memory-system')) {
   // Keep authoritative table/index definitions; historical seeds contain damaged text,
   // the view refers to a formerly missing tags column, and the trigger conflicts with
   // the current API's explicit AI hit classification. All are handled separately.
   sql=sql.slice(0,sql.indexOf('ALTER TABLE materials'));
 }
 out += `\n-- Source: ${p}\n${sql}\n`;
}
out += fs.readFileSync(path.join(root,'sql/empty-database-additions.sql'),'utf8');
out += fs.readFileSync(path.join(root,'sql/empty-database-security.sql'),'utf8');
out += '\nNOTIFY pgrst, \'reload schema\';\nCOMMIT;\n';
fs.writeFileSync(path.join(root,'sql/initialize-empty-test-database.sql'),out);
console.log('Wrote reviewed empty-test baseline.');
