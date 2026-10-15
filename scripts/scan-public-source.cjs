// Reports locations and rule names only. Never prints matched credentials.
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const findings=[];let checked=0;
const ignore=new Set(['node_modules','.next','.git','dist','coverage']);
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['jwt',/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/],
 ['provider-key',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{24,}|sb_secret_[A-Za-z0-9_-]{20,})\b/],
 ['credential-assignment',/(?:api[_-]?key|secret|password|access[_-]?token|service[_-]?role[_-]?key)\s*[=:]\s*["'][^"'\s]{20,}["']/i],
 ['database-password-url',/postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]{4,}@/i],
];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignore.has(entry.name)||entry.isSymbolicLink())continue;const full=path.join(dir,entry.name),name=path.relative(root,full).replaceAll('\\','/');if(entry.isDirectory()){walk(full);continue}checked++;
 if((entry.name.startsWith('.env')&&entry.name!=='.env.example')||/\.(?:pem|p12|pfx|key|docx?|mp4|sqlite|db|log)$/i.test(entry.name)){findings.push({path:name,rule:'private-file'});continue}
 if(entry.name==='pnpm-lock.yaml'||entry.name==='THIRD_PARTY_NOTICES.md'||entry.name==='scan-public-source.cjs')continue;
 const bytes=fs.readFileSync(full);if(bytes.includes(0))continue;const lines=bytes.toString('utf8').split(/\r?\n/);for(let i=0;i<lines.length;i++)for(const [rule,regex] of rules){const hit=lines[i].match(regex);if(!hit)continue;
 // Only explicit synthetic test passwords may be exempted from the generic
 // assignment rule. Provider-token, JWT and private-key rules still scan tests.
 if(rule==='credential-assignment'&&name.startsWith('tests/')&&/fixture|private|SHOULD-NOT-LEAK|SENSITIVE-STORED-PASS|long-enough-password|operator-/i.test(hit[0]))continue;
 findings.push({path:name,line:i+1,rule});}}}
walk(root);console.log(JSON.stringify({checked,findings},null,2));process.exitCode=findings.length?1:0;
