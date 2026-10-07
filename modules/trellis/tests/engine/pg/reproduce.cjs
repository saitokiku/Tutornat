'use strict';
// Records observed results, including blockers. No generated expected-PASS logs.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync,execFileSync}=require('node:child_process');
const {safePaths}=require('./paths.cjs');
const root=safePaths().root;
const baseArg=process.argv.find(x=>x.startsWith('--base='))?.slice(7)||'ff65a54';
if(!/^[0-9a-f]{7,40}$/.test(baseArg))throw new Error('base must be a commit hash');
const base=execFileSync('git',['rev-parse','--verify',baseArg+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
const temp=path.join(root,'.tmp');
fs.mkdirSync(temp,{recursive:true});
if(fs.realpathSync(temp)!==temp)throw new Error('temporary root is not physical');
const scratch=fs.mkdtempSync(path.join(temp,'e2-reproduce-'));
const evidenceSubdir=process.argv.find(x=>x.startsWith('--evidence-subdir='))?.slice(18);
if(evidenceSubdir&&!/^[a-z0-9-]+$/.test(evidenceSubdir))throw new Error('invalid evidence subdirectory');
const evidenceRoot=path.join(__dirname,'evidence');
if(fs.realpathSync(evidenceRoot)!==evidenceRoot)throw new Error('evidence root is not physical');
const out=evidenceSubdir?path.join(evidenceRoot,evidenceSubdir):evidenceRoot;
fs.mkdirSync(out,{recursive:true});
if(fs.realpathSync(out)!==out)throw new Error('evidence path is not physical');
const env={...process.env,TMPDIR:scratch};
const report={base,observedStart:execFileSync('date',['+%Y-%m-%d %H:%M:%S %Z'],{encoding:'utf8'}).trim(),commands:[],surfaceDifferential:[]};
const quote=s=>/^[a-zA-Z0-9_./:=+-]+$/.test(s)?s:"'"+s.replaceAll("'","'\\''")+"'";
function execute(name,command,args,{cwd=root,criterion=null,expectedExit=0,extraEnv={}}={}) {
  const result=spawnSync(command,args,{cwd,env:{...env,...extraEnv},encoding:'utf8',maxBuffer:64*1024*1024,timeout:180000});
  const output=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.message:'');
  const record={name,criterion,cwd,command:[command,...args],exit:result.status,signal:result.signal,expectedExit,environment:extraEnv,log:name+'.log'};
  fs.writeFileSync(path.join(out,record.log),'$ '+[...Object.entries(extraEnv).map(([key,value])=>key+'='+quote(value)),...[command,...args].map(quote)].join(' ')+'\n'+output+'\nexit='+result.status+'\n');
  report.commands.push(record);
  console.log(JSON.stringify(record));
  return result;
}
let prepared=false;
let aTree=null;
try {
  execute('local-controls',process.execPath,['--test','tests/engine/pg/helpers.test.cjs','tests/engine/pg/bindings.test.cjs','tests/engine/pg/scope.test.cjs']);
  execute('typecheck','sh',['tests/engine/harness/typecheck.sh']);
  execute('e1-head-sqlite',process.execPath,['--no-warnings','--experimental-sqlite','tests/engine/run.cjs','--mode','head','--out-suffix','e2c-sqlite'],{criterion:5});
  const headJson=path.join(root,'tests/engine/evidence/results-head-e2c-sqlite.json');
  if(fs.existsSync(headJson))fs.renameSync(headJson,path.join(out,'e1-head-sqlite.json'));
  const tree=path.join(scratch,'base');fs.mkdirSync(tree);
  const archive=path.join(scratch,'base.tar');
  fs.writeFileSync(archive,execFileSync('git',['archive','--format=tar',base],{cwd:root,maxBuffer:128*1024*1024}));
  const listing=execFileSync('tar',['-tvf',archive],{encoding:'utf8'}).trim().split('\n');
  if(listing.some(line=>/^[lh]/.test(line)))throw new Error('baseline archive contains links');
  // docs/ is not an input to any step below and the reviewer sandbox refuses
  // writes under docs/ (issue #10, item 5); it is left out of the extraction.
  execFileSync('tar',['-xf',archive,'-C',tree,'--exclude=docs','--exclude=docs/*']);
  if(fs.existsSync(path.join(tree,'docs')))throw new Error('baseline extraction included docs/');
  for(const entry of fs.readdirSync(tree))if(fs.realpathSync(path.join(tree,entry))!==path.join(tree,entry))throw new Error('baseline top-level entry resolves elsewhere');
  execute('e1-base-sqlite',process.execPath,['--no-warnings','--experimental-sqlite','tests/engine/run.cjs','--mode','head'],{cwd:tree,criterion:5});
  const baseJson=path.join(tree,'tests/engine/evidence/results-head.json');
  if(fs.existsSync(baseJson))fs.copyFileSync(baseJson,path.join(out,'e1-base-sqlite.json'));
  const surfaces=[
    [0,'tests/engine/pg/up.sh'],[0,'tests/engine/pg/harness.cjs'],
    [1,'db/migrations/0001_authority.sql'],[1,'db/migrate.cjs'],
    [2,'db/migrations/0002_operations.sql'],[3,'db/migrations/0001_authority.sql'],
    [4,'tests/engine/pg/barriers.cjs'],[4,'tests/engine/pg/prove.cjs'],
    [6,'db/migrations/0004_interfaces.sql'],[6,'db/migrations/0005_projection_lock_order.sql'],[6,'db/migrations/0006_fixture_and_practice_guards.sql'],[6,'tests/engine/pg/interfaces.cjs'],
    ['offers','db/migrations/0003_assessment_offers.sql'],['offers','tests/engine/pg/offers.cjs'],
    [5,'tests/engine/pg/e1-db.cjs'],[5,'tests/engine/run.cjs'],[5,'tests/engine/harness/sqlite-db.cjs'],
  ];
  const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
  for(const [criterion,file] of surfaces) {
    const prior=spawnSync('git',['show',base+':'+file],{cwd:root,encoding:null});
    const current=fs.readFileSync(path.join(root,file));
    report.surfaceDifferential.push({criterion,file,baseExists:prior.status===0,headExists:true,baseSha256:prior.status===0?sha(prior.stdout):null,headSha256:sha(current),unchanged:prior.status===0&&prior.stdout.equals(current)});
  }
  execute('pg-driver',process.execPath,['tests/engine/pg/resolve-pg.cjs'],{criterion:0});
  if(require('./paths.cjs').externalCluster()&&!fs.existsSync(safePaths().state)) {
    const lifecycle=execute('pg-external-lifecycle',process.execPath,['tests/engine/pg/external-test.cjs'],{criterion:0});
    if(lifecycle.status!==0)throw new Error('external lifecycle controls failed');
  } else if(require('./paths.cjs').externalCluster()) {
    report.skippedChecks=[{name:'pg-external-lifecycle',reason:'existing up receipt; standalone lifecycle controls require a fresh run'}];
  }
  const up=execute('pg-up','sh',['tests/engine/pg/up.sh'],{criterion:0});
  if(up.status!==0)throw new Error('cluster preparation failed; refusing downstream mutations');
  prepared=true;
  execute('pg-version',process.execPath,['tests/engine/pg/server-identity.cjs'],{criterion:0});
  execute('pg-migrate',process.execPath,['db/migrate.cjs'],{criterion:1});
  execute('migration-down-refusal',process.execPath,['db/migrate.cjs','--down'],{criterion:1,expectedExit:1});
  for(const number of [0,1,2,3,4,5,6,7])execute('pg-c'+number,process.execPath,['tests/engine/pg/prove.cjs','--case=c'+number],{criterion:number});
  execute('pg-e1-adapter',process.execPath,['tests/engine/pg/e1-test.cjs'],{criterion:5});
  execute('pg-e1-head','sh',['tests/engine/pg/e1-run.sh','--mode','head','--out-suffix','pg'],{criterion:5});
  const pgJson=path.join(root,'tests/engine/evidence/results-head-pg.json');
  if(fs.existsSync(pgJson))fs.renameSync(pgJson,path.join(out,'e1-head-pg.json'));
  const aRef=process.argv.find(x=>x.startsWith('--a-head='))?.slice(9)||'b176c81';
  if(!/^[0-9a-f]{7,40}$/.test(aRef))throw new Error('A head must be a commit hash');
  report.aHead=execFileSync('git',['rev-parse','--verify',aRef+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
  aTree=path.join(scratch,'a-head');
  const added=execute('a-head-worktree','git',['worktree','add','--detach',aTree,report.aHead],{criterion:6});
  if(added.status!==0)throw new Error('could not create A scratch worktree');
  execute('pg-e1-a-head',process.execPath,['--no-warnings','--require',path.join(__dirname,'e1-preload.cjs'),path.join(aTree,'tests/engine/run.cjs'),'--mode','head'],{
    criterion:6,extraEnv:{E1_PG_SUITE_ROOT:aTree,E1_PG_RESULT_PATH:path.join(out,'e1-a-head-pg.json')},
  });
  report.aScratchStatus=execFileSync('git',['status','--porcelain=v1','--untracked-files=all'],{cwd:aTree,encoding:'utf8'});
  if(report.aScratchStatus!=='')throw new Error('A scratch checkout changed');
  execute('a-head-read-only','git',['diff','--exit-code','HEAD','--'],{cwd:aTree,criterion:6});
  execute('ci-workflows','gh',['api','repos/gokumann-pm/kaizenedu/actions/workflows','--jq','{total_count: .total_count, workflows: [.workflows[].name]}']);
} catch(error) {
  report.error=error.message;
  console.error(error.stack);
} finally {
  if(aTree)execute('a-head-cleanup','git',['worktree','remove',aTree],{criterion:6});
  if(prepared)execute('pg-down','sh',['tests/engine/pg/down.sh'],{criterion:0});
  report.observedEnd=execFileSync('date',['+%Y-%m-%d %H:%M:%S %Z'],{encoding:'utf8'}).trim();
  report.failed=report.commands.filter(r=>r.exit!==r.expectedExit).map(r=>r.name);
  if(report.error)report.failed.push('collector-error');
  const required=['pg-up','pg-version','pg-driver','pg-migrate','pg-c0','pg-c1','pg-c2','pg-c3','pg-c4','pg-c5','pg-c6','pg-c7','pg-e1-a-head','pg-e1-adapter','pg-e1-head','pg-down'];
  report.pgProven=required.every(name=>report.commands.some(r=>r.name===name&&r.exit===0))&&report.commands.filter(r=>r.name.startsWith('pg-')).every(r=>r.exit===0);
  fs.writeFileSync(path.join(out,'reproduction.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pgProven:report.pgProven,failed:report.failed,artifact:path.relative(root,path.join(out,'reproduction.json'))}));
  if(report.failed.length)process.exitCode=1;
  fs.rmSync(scratch,{recursive:true,force:true});
}
