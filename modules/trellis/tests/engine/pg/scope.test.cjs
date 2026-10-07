'use strict';
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const test=require('node:test');
const {safePaths}=require('./paths.cjs');
function allowed(file) {
  return /^(db\/(?:migrations\/[^/]+\.sql|README\.md|migrate\.cjs)|tests\/engine\/pg\/|lib\/tutor\/db\/|\.gitignore$|package\.json$|THIRD_PARTY_NOTICES\.md$)/.test(file);
}
test('part C diff permits its seam and rejects protected or other-part paths',()=>{
  for(const file of ['db/migrations/0001_authority.sql','tests/engine/pg/prove.cjs','lib/tutor/db/postgres.ts','package.json'])assert(allowed(file));
  const rejected=['docs/product/spec.md','SPEC.md','DIRECTION.md','docs/anything.md','lib/tutor/checks/service.ts','lib/tutor/model/evidence.ts','reference-implementations/file'];
  for(const file of rejected)assert.equal(allowed(file),false,file);
  const status=execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:safePaths().root,encoding:'utf8'});
  const changed=status.trimEnd().split('\n').filter(Boolean).map(line=>line.slice(3));
  assert.deepEqual(changed.filter(file=>!allowed(file)),[]);
  console.log(JSON.stringify({positiveAllowed:['db/migrations/0001_authority.sql','tests/engine/pg/prove.cjs'],negativeRejected:rejected,actualChangedPaths:changed}));
});
