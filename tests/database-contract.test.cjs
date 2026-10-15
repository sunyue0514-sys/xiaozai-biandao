const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const inventory=require('../scripts/database-inventory.cjs');
const sql=fs.readFileSync(path.join(__dirname,'../sql/initialize-empty-test-database.sql'),'utf8').replace(/--[^\n]*/g,'');
const schema=new Map();
// Reviewed SQL uses ordinary CREATE/ALTER statements. This is a static contract
// check, not a PostgreSQL parser or substitute for tests/database-integration.sql.
for(const m of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?\s*\(/gi)) {
 const start=m.index+m[0].length;let depth=1,pos=start;
 for(;pos<sql.length&&depth;pos++){if(sql[pos]==='(')depth++;else if(sql[pos]===')')depth--;}
 const body=sql.slice(start,pos-1),cols=new Set();
 for(const line of body.split(/,(?![^()]*\))/)) {const match=line.trim().match(/^"?(\w+)"?\s+(?:serial|bigserial|int\b|integer|bigint|text|varchar|numeric|decimal|boolean|timestamp|timestamptz|date|jsonb)\b/i);if(match)cols.add(match[1]);}
 schema.set(m[1],cols);
}
for(const m of sql.matchAll(/ALTER TABLE\s+"?(\w+)"?\s+([\s\S]*?);/gi)) {
 const cols=schema.get(m[1]);if(!cols)continue;
 for(const c of m[2].matchAll(/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/gi))cols.add(c[1]);
}
schema.set('customer_materials',new Set(schema.get('materials')));
test('every literal Supabase relation and statically resolved field exists',()=>{
 const missing=[];
 for(const [table,contract] of Object.entries(inventory)){
  const cols=schema.get(table);if(!cols){missing.push(table);continue;}
  for(const column of contract.columns)if(!cols.has(column))missing.push(`${table}.${column}`);
 }
 assert.deepEqual(missing,[]);
});
test('fresh installation fails closed and never exposes arbitrary SQL',()=>{
 assert.match(sql,/BEGIN;/);assert.match(sql,/public schema is not empty/);
 assert.match(sql,/rolbypassrls/);assert.match(sql,/COMMIT;/);
 assert.doesNotMatch(sql,/CREATE\s+(?:OR REPLACE\s+)?FUNCTION\s+(?:public\.)?exec_sql\b/i);
 assert.doesNotMatch(sql,/GRANT[^;]+TO\s+(?:anon|authenticated)\b/i);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated/);
});
test('required upsert keys and PostgREST relationship names are represented',()=>{
 assert.match(sql,/UNIQUE\(user_id, task_key\)/);
 assert.match(sql,/user_id integer NOT NULL UNIQUE/);
 assert.match(sql,/uid TEXT NOT NULL UNIQUE/i);
 assert.match(sql,/replied_by integer REFERENCES users\(id\)/);
 assert.match(sql,/inviter_id integer NOT NULL REFERENCES users\(id\)/);
 assert.match(sql,/customer_id integer REFERENCES customers\(id\) ON DELETE SET NULL/);
});
