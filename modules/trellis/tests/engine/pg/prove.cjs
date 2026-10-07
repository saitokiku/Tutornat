'use strict';
// Each case is independently selectable. Only native PostgreSQL can produce PASS.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { owner,connect,open,provisionPrincipals,transaction,ROLES }=require('./harness.cjs');
const { gate,waitBlocked,lockSkills }=require('./barriers.cjs');
const { migrate,migrationFiles }=require('../../../db/migrate.cjs');
const run=crypto.randomUUID().replaceAll('-','');
const learner='l_'+run;
const item='i_'+run;
const rubric='r_'+run;
const skill='s_'+run;
let admin;
let pgConnected=false;
const clients=[];
const emit=(criterion,test,role,observation)=>console.log(JSON.stringify({criterion,test,role,...observation}));
async function client(role='assessment',household='h1') { const c=await connect({role,household}); clients.push(c); console.log(JSON.stringify({connection:c.fixtureIdentity})); return c; }
async function scalar(c,sql,params=[]) { return (await c.query(sql,params)).rows[0].value; }
async function fails(c,sql,params,code) {
  try { await c.query(sql,params); assert.fail('negative query unexpectedly succeeded: '+sql); }
  catch(e) { assert.equal(e.code,code,`${e.message}; expected SQLSTATE ${code}`); return {code:e.code,message:e.message,...(e.detail?{detail:e.detail}:{})}; }
}
async function seed() {
  admin=await owner();pgConnected=true;
  console.log(JSON.stringify({server:await require('./harness.cjs').serverIdentity(admin)}));
  await migrate(admin);
  for(const h of ['h1','h2']) {
    await admin.query('INSERT INTO e2.households(household_id,timezone) VALUES($1,$2) ON CONFLICT DO NOTHING',[h,'America/Chicago']);
    await admin.query('INSERT INTO e2.learners(household_id,id) VALUES($1,$2)',[h,learner]);
    await admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES($1,'item','unused-synthetic','1','fixture marker','{}')",[h]);
    await admin.query("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES($1,'e2-draft-1',$2,$3) ON CONFLICT DO NOTHING",[h,{delayHours:48,quietWindowReps:10,escalationDays:14,daySeven:[6,9],certification:false},{source:'synthetic-fixture'}]);
    await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES($1,$2,'1','approved',$3,$4)",[h,rubric,{method:'exact-equality'},{review:'synthetic'}]);
    for(const [suffix,approval] of [['','approved'],['_second','approved'],['_draft','draft']]) {
      await admin.query("INSERT INTO e2.items(household_id,id,version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,approval,content,answer_key,provenance) VALUES($1,$2,'1','1',$3,'1',$4,'1',$5,$6,$7,$8,$9,$10)",
        [h,item+suffix,rubric,skill,'family'+suffix,'context'+suffix,approval,{prompt:'Synthetic arithmetic',stem:'2 + 2',householdMarker:h},numericKey('4'),{review:'synthetic'}]);
    }
  }
  await provisionPrincipals(admin);
  await provisionAuthors();
  // E3-K (#17): the two-key rule — only the two approved items per household get two author keys and an
  // approval; the draft stays unkeyed so its refusal is still the content-approval refusal.
  for(const h of ['h1','h2'])for(const suffix of ['','_second'])await approveItem(admin,item+suffix,{household:h});
}
// E3-K (#17): two synthetic author logins per household, provisioned by the migration owner exactly like
// C's principals. The author is the session login (never a parameter); the capability role is `author`.
const AUTHOR_LOGINS={h1:['e2_h1_author','e2_h1_author2'],h2:['e2_h2_author','e2_h2_author2']};
const numericKey=value=>({type:'numeric',options:null,answer:{value,tolerance:0}});
async function provisionAuthors() {
  for(const [household,logins] of Object.entries(AUTHOR_LOGINS))for(const login of logins) {
    const found=await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[login]);
    if(found.rowCount===0)await admin.query(`CREATE ROLE ${login} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await admin.query(`GRANT author TO ${login}`);
    await admin.query('INSERT INTO e2.principals(login,household_id) VALUES($1,$2) ON CONFLICT(login) DO UPDATE SET household_id=EXCLUDED.household_id',[login,household]);
  }
}
// Two author logins each key the item through e2.author_key, then e2.approve_item records the decision; the
// fixture asserts it was `approved`. It runs on the owner connection so a clone made inside an owner
// transaction (c6) is keyed and approved in that same transaction; SET LOCAL SESSION AUTHORIZATION is the
// superuser-only fixture device that makes each author the session login, and it is restored before return.
async function approveItem(c,id,{household='h1',version='1',value='4'}={}) {
  const inTransaction=(await c.query('SELECT pg_current_xact_id_if_assigned() IS NOT NULL AS value')).rows[0].value;
  if(!inTransaction)await c.query('BEGIN');
  try {
    for(const login of AUTHOR_LOGINS[household]) {
      await c.query(`SET LOCAL SESSION AUTHORIZATION ${login}`);
      await c.query('SET LOCAL ROLE author');
      await c.query('SELECT e2.author_key($1,$2,$3,$4)',[id,version,numericKey(value),{source:'synthetic-fixture'}]);
    }
    const event=(await c.query('SELECT e2.approve_item($1,$2,$3,$4) AS value',[id,version,`approve_${household}_${id}`,{source:'synthetic-fixture'}])).rows[0].value;
    await c.query('SET LOCAL SESSION AUTHORIZATION DEFAULT');
    assert.equal(event.outcome,'approved',`two-key approval of ${household}/${id} refused: ${JSON.stringify(event.reasons)}`);
    if(!inTransaction)await c.query('COMMIT');
    return event;
  } catch(e) { if(!inTransaction)await c.query('ROLLBACK').catch(()=>{}); throw e; }
}
async function issue(c,{suffix='',operation=crypto.randomUUID(),s=item}={}) {
  return scalar(c,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7) AS value',[learner,s+suffix,'1',operation,'session_'+run,'fixture-scorer','1']);
}
async function submit(c,a,response={answer:4}) { return scalar(c,'SELECT e2.submit_attempt($1,$2,$3) AS value',[learner,a.id,response]); }
async function finalize(c,a,response={answer:4},score={correct:true}) { return scalar(c,'SELECT e2.finalize_attempt($1,$2,$3,$4) AS value',[learner,a.id,response,score]); }
async function exposure(c,{skills=[skill],operation=crypto.randomUUID(),payload={kind:'hint'},version='1'}={}) {
  return scalar(c,'SELECT e2.record_exposure($1,$2,$3,$4,$5,$6,$7) AS value',[learner,skills,version,operation,'session_'+run,payload,{source:'synthetic'}]);
}
async function cloneItem(label,{skillId=skill,skillVersion='1'}={}) {
  const id=item+'_'+label;
  await admin.query("INSERT INTO e2.items SELECT household_id,$1,version,key_version,rubric_id,rubric_version,$2,$3,family_id||$1,context_tag||$1,approval,content,answer_key,provenance FROM e2.items WHERE household_id='h1' AND id=$4",[id,skillId,skillVersion,item]);
  await approveItem(admin,id);
  return id;
}
async function counts(c,a) {
  return (await c.query('SELECT a.state,a.response,a.final_result,(SELECT count(*)::int FROM e2.evidence_events e WHERE e.attempt_id=a.id) AS evidence_count FROM e2.attempts a WHERE a.id=$1',[a.id])).rows[0];
}
const cases={};
cases.c0=async()=> {
  const pool=await open({count:4});
  try {
    const rows=await Promise.all(pool.clients.map(c=>scalar(c,"SELECT jsonb_build_object('pid',pg_backend_pid(),'login',session_user,'role',current_user,'household',e2.household_id(),'version',current_setting('server_version'),'versionNum',current_setting('server_version_num')) AS value")));
    assert.equal(new Set(rows.map(r=>r.pid)).size,4);
    assert.deepEqual(rows.map(r=>r.role),ROLES);
    assert(rows.every(r=>r.household==='h1'&&r.versionNum==='170011'));
    const own=await scalar(pool.clients[0],'SELECT count(*)::int AS value FROM e2.learners WHERE id=$1',[learner]);
    assert.equal(own,1);
    const denied=await fails(pool.clients[0],'SET ROLE assessment',[],'42501');
    await assert.rejects(open({count:3}),/at least four/);
    emit('0','independent_connections_and_role_switching','four household logins',{connections:rows,positiveOwnLearner:own,negativePrivilegeSwitch:denied,negativeTooFew:'rejected'});
  } finally { await pool.close(); }
};
cases.c1=async()=> {
  const a=await client(); const t=await client('tutor');
  const once=await migrate(admin); const twice=await migrate(admin,{reapply:true});
  assert(once.every(m=>m.status==='unchanged')); assert(twice.every(m=>m.status==='reapplied'));
  const files=migrationFiles(); files[0]={...files[0],sha256:'0'.repeat(64)};
  await assert.rejects(migrate(admin,{files}),/checksum mismatch/);
  const op=crypto.randomUUID(); const attempt=await issue(a,{operation:op});
  assert.equal((await issue(a,{operation:op})).id,attempt.id);
  const issueConflict=await fails(a,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7)',[learner,item+'_second','1',op,'session_'+run,'fixture-scorer','1'],'P0001');
  const approved=attempt.item_id===item;
  const draft=await fails(a,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7)',[learner,item+'_draft','1',crypto.randomUUID(),'s','fixture-scorer','1'],'P0001');
  const submitted=await submit(a,attempt);
  assert.equal(submitted.state,'submitted');
  const responseConflict=await fails(a,'SELECT e2.submit_attempt($1,$2,$3)',[learner,attempt.id,{answer:5}],'P0001');
  const result=await finalize(a,attempt); assert.equal(result.qualifying,true);
  const noCertification=await fails(admin,"UPDATE e2.projections SET certification='supported' WHERE household_id='h1' AND learner_id=$1",[learner],'23514');
  assert.equal(result.certification,'none');
  assert.deepEqual(await finalize(a,attempt,{answer:4},{correct:false}),result);
  const mutations=[];
  for(const table of ['rule_versions','rubrics','items','content_revocations','exposure_events','evidence_events']) {
    for(const op of ['UPDATE','DELETE','TRUNCATE']) {
      const sql=op==='UPDATE'?`UPDATE e2.${table} SET household_id=household_id WHERE false`:op==='DELETE'?`DELETE FROM e2.${table} WHERE false`:`TRUNCATE e2.${table} CASCADE`;
      // The owner bypasses ordinary grants: these checks exercise the trigger itself.
      mutations.push({table,op,...await fails(admin,sql,[],'55000')});
    }
  }
  const frozen=await fails(admin,'UPDATE e2.attempts SET key_version=$1 WHERE id=$2',['forged',attempt.id],'55000');
  const terminal=await fails(admin,"UPDATE e2.attempts SET state='issued',final_result=NULL,finalized_at=NULL WHERE id=$1",[attempt.id],'55000');
  const practice=await scalar(t,'SELECT e2.append_practice($1,$2,$3,$4,$5,$6,$7) AS value',[learner,skill,'1',crypto.randomUUID(),'s',{qualifying:true,evidenceClass:'delayed-retention'},{source:'synthetic-parent-observation'}]);
  assert.equal(practice.qualifying,false); assert.equal(practice.class,'corrections-practice');
  const boundaries=[];
  for(const delta of [-1,0,1,43200000]) {
    const boundarySkill=skill+'_boundary_'+(delta+1);
    const boundaryItem=await cloneItem('boundary_'+(delta+1),{skillId:boundarySkill});
    await exposure(t,{skills:[boundarySkill]});
    // Owner-only fixture moves the stored server clock into a known past. The
    // issued timestamp is then computed with full PG microsecond precision.
    await admin.query("UPDATE e2.skill_guards SET last_exposure_at=clock_timestamp()-interval '72 hours' WHERE household_id='h1' AND learner_id=$1 AND skill_id=$2",[learner,boundarySkill]);
    const fn='fixture_boundary_'+run;
    await admin.query(`CREATE FUNCTION e2.${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN SELECT last_exposure_at+interval '48 hours'+interval '${delta} milliseconds' INTO NEW.issued_at FROM e2.skill_guards WHERE household_id=NEW.household_id AND learner_id=NEW.learner_id AND skill_id=NEW.skill_id; RETURN NEW; END; $$`);
    await admin.query(`CREATE TRIGGER ${fn} BEFORE INSERT ON e2.attempts FOR EACH ROW EXECUTE FUNCTION e2.${fn}()`);
    let candidate;
    try {candidate=await issue(a,{s:boundaryItem});}
    finally {await admin.query(`DROP TRIGGER ${fn} ON e2.attempts`);await admin.query(`DROP FUNCTION e2.${fn}()`);}
    await submit(a,candidate);const observed=await finalize(a,candidate);
    assert.equal(observed.qualifying,delta>=0);
    boundaries.push({millisecondsFrom48h:delta,result:observed});
  }
  const otherItem=await cloneItem('unrelated');
  const unaffected=await issue(a,{s:otherItem});await submit(a,unaffected);
  await exposure(t,{skills:[skill+'_unrelated']});
  const unrelated=await finalize(a,unaffected);assert.equal(unrelated.qualifying,true);
  await exposure(t);
  const v2=await cloneItem('revision',{skillVersion:'2'});
  const changedVersion=await issue(a,{s:v2});await submit(a,changedVersion);
  const versionResult=await finalize(a,changedVersion);assert.equal(versionResult.qualifying,false);assert(versionResult.reasons.includes('delay_under_48h'));
  const revocable=await cloneItem('revocable',{skillId:skill+'_revocable'});
  const revokedAttempt=await issue(a,{s:revocable});await submit(a,revokedAttempt);
  await admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','item',$1,'1','fixture withdrawal','{}')",[revocable]);
  const revoked=await finalize(a,revokedAttempt);assert.equal(revoked.qualifying,false);assert(revoked.reasons.includes('content_not_approved'));
  const revokeIssue=await fails(a,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7)',[learner,revocable,'1',crypto.randomUUID(),'s','fixture-scorer','1'],'P0001');
  const originalHistory=await finalize(a,attempt);assert.deepEqual(originalHistory,result);
  // Same timestamps have separate server UUIDs and identity order; a forced UUID
  // collision fails uniqueness without replacing the first stored result.
  const collisionName='fixture_collision_'+run;
  await admin.query(`CREATE FUNCTION e2.${collisionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.id:='${attempt.id}'::uuid; NEW.issued_at:='${attempt.issued_at}'::timestamptz; RETURN NEW; END; $$`);
  await admin.query(`CREATE TRIGGER ${collisionName} BEFORE INSERT ON e2.attempts FOR EACH ROW EXECUTE FUNCTION e2.${collisionName}()`);
  let collision;
  try {collision=await fails(a,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7)',[learner,item,'1',crypto.randomUUID(),'s','fixture-scorer','1'],'23505');}
  finally {await admin.query(`DROP TRIGGER ${collisionName} ON e2.attempts`);await admin.query(`DROP FUNCTION e2.${collisionName}()`);}
  assert.deepEqual(await finalize(a,attempt),result);
  const burstPrefix='burst_'+run;
  await t.query("SELECT e2.append_practice($1,$2,'1',$3||n,'s','{\"qualifying\":true}'::jsonb,'{}') FROM generate_series(1,1105) n",[learner,skill,burstPrefix]);
  const burst=await scalar(t,"SELECT jsonb_build_object('rows',count(*),'qualifying',count(*) FILTER(WHERE qualifying)) AS value FROM e2.evidence_events WHERE operation_id LIKE $1",['practice:'+burstPrefix+'%']);
  assert.equal(burst.rows,1105);assert.equal(burst.qualifying,0);
  // Score and familiarity gates (issue #10 item 1; mutants M5 and M4). Each on
  // a fresh skill so no other reason can mask the one under test.
  const scoreCases=[];
  for(const [label,score] of [['wrong_score',{correct:false}],['ungraded_empty',{}],['ungraded_null',null]]) {
    const scoreItem=await cloneItem(label,{skillId:skill+'_'+label});
    const scoreAttempt=await issue(a,{s:scoreItem});await submit(a,scoreAttempt);
    const scored=await finalize(a,scoreAttempt,{answer:4},score);
    assert.equal(scored.qualifying,false,label+' must not qualify');assert(scored.reasons.includes('not_correct_or_ungraded'),label+' reasons: '+JSON.stringify(scored.reasons));
    assert(!scored.reasons.includes('familiar_item'));
    scoreCases.push({label,score,result:scored});
  }
  const familiarItem=await cloneItem('familiar',{skillId:skill+'_familiar'});
  const firstIssue=await issue(a,{s:familiarItem});await submit(a,firstIssue);
  const firstSeen=await finalize(a,firstIssue);assert.equal(firstSeen.qualifying,true,'first presentation is the positive control');
  const reissued=await issue(a,{s:familiarItem});assert.notEqual(reissued.id,firstIssue.id);await submit(a,reissued);
  const familiar=await finalize(a,reissued);
  assert.equal(familiar.qualifying,false,'re-issued item must not qualify');assert(familiar.reasons.includes('familiar_item'),'familiar reasons: '+JSON.stringify(familiar.reasons));
  assert(!familiar.reasons.includes('not_correct_or_ungraded'));
  emit('1','score_and_familiarity_gates','assessment',{scoreCases,firstSeen,familiar});
  emit('1','timing_versions_revocation_collisions_and_burst','assessment/tutor; owner timestamp and collision fixtures',{boundaries,unrelated,versionResult,revoked,revokeIssue,originalHistory,collision,burst});
  emit('1','migrations_and_immutable_contract','owner/assessment/tutor',{once,twice,checksumMismatch:'rejected',noCertification,approved,unapproved:draft,issueRetrySameId:true,issueConflict,responseConflict,firstResult:result,retryResult:result,mutations,frozen,terminal,practice:{class:practice.class,qualifying:practice.qualifying,payload:practice.payload}});
};
cases.c2=async()=> {
  const a=await client(); const attempt=await issue(a); await submit(a,attempt);
  const roles=[];
  for(const role of ['learner','tutor','report']) {
    const c=await client(role);
    const positiveOwn=await scalar(c,'SELECT count(*)::int AS value FROM e2.attempts WHERE id=$1',[attempt.id]); assert.equal(positiveOwn,1);
    const direct=await fails(c,"INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version) VALUES('h1',$1,'attack','s',$2,'1',1,'unassisted-attempt',true,'{}','{}','e2-draft-1')",[learner,skill],'42501');
    const view=await fails(c,"INSERT INTO e2.evidence_view(household_id,learner_id,operation_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,payload,provenance,rule_version) VALUES('h1',$1,'attack','s',$2,'1',1,'unassisted-attempt',true,'{}','{}','e2-draft-1')",[learner,skill],'42501');
    const finalized=await fails(c,'SELECT e2.finalize_attempt($1,$2,$3,$4)',[learner,attempt.id,{answer:4},{correct:true}],'42501');
    const rawUpdate=await fails(c,"UPDATE e2.attempts SET state='finalized' WHERE id=$1",[attempt.id],'42501');
    const escalation=await fails(c,'SET ROLE assessment',[],'42501');
    const internal=await fails(c,'SET ROLE e2_writer',[],'42501');
    const loginSpoof=await fails(c,'SET SESSION AUTHORIZATION e2_h2_assessment',[],'42501');
    const membership=await scalar(admin,"SELECT pg_has_role($1,'assessment','MEMBER') AS value",[`e2_h1_${role}`]); assert.equal(membership,false);
    roles.push({role,positiveOwn,direct,view,finalized,rawUpdate,escalation,internal,loginSpoof,membership});
  }
  const result=await finalize(a,attempt); assert.equal(result.qualifying,true);
  const remaining=await scalar(a,'SELECT count(*)::int AS value FROM e2.evidence_events WHERE attempt_id=$1',[attempt.id]);assert.equal(remaining,1);
  const inheritance=await client('learner');const parent='fixture_parent_'+run;
  await admin.query(`CREATE ROLE ${parent} NOLOGIN`);
  let before,after;
  try {
    await admin.query(`GRANT e2_writer TO ${parent}`);await admin.query(`GRANT ${parent} TO learner`);
    await inheritance.query('SET ROLE e2_writer');
    before=await scalar(inheritance,'SELECT current_user AS value');assert.equal(before,'e2_writer');
    await inheritance.query('RESET ROLE');
    await migrate(admin,{reapply:true});
    await inheritance.query('SET ROLE learner');
    after=await fails(inheritance,'SET ROLE e2_writer',[],'42501');
  } finally {await admin.query(`REVOKE ${parent} FROM learner`);await admin.query(`REVOKE e2_writer FROM ${parent}`);await admin.query(`DROP ROLE ${parent}`);}
  emit('2','inherited_grant_regression','owner injects inheritance; learner tries escalation',{beforeReapply:before,afterReapply:after,positiveOwnRead:await scalar(inheritance,'SELECT e2.household_id() AS value')});
  emit('2','qualifying_authority_per_role','learner/tutor/report/assessment',{roles,positiveAssessment:result,resultRows:remaining});
};
cases.c3=async()=> {
  const a=await client(); const b=await client('assessment','h2'); const t=await client('tutor'); const tb=await client('tutor','h2');
  const attempt=await issue(a);await submit(a,attempt);await finalize(a,attempt);
  const foreign=await issue(b);await submit(b,foreign);await finalize(b,foreign);
  await exposure(t);await exposure(tb);
  const tables=['households','learners','rule_versions','rubrics','items','content_guards','content_revocations','skill_guards','attempts','exposure_events','evidence_events','projections'];
  const views=['report_projection','evidence_view','item_presentations'];
  const matrix=[];
  for(const role of ROLES) {
    const c=await client(role);
    for(const table of [...tables,...views]) {
      if(table==='rubrics'&&role!=='assessment') {
        matrix.push({role,table,read:await fails(c,`SELECT * FROM e2.${table}`,[],'42501'),positivePresentation:await scalar(c,"SELECT count(*)::int AS value FROM e2.item_presentations WHERE household_id='h1'")});
      } else {
        const own=await scalar(c,`SELECT count(household_id)::int AS value FROM e2.${table} WHERE household_id='h1'`);
        const other=await scalar(c,`SELECT count(household_id)::int AS value FROM e2.${table} WHERE household_id='h2'`);
        assert(own>0,`${role}/${table} has no positive control`);assert.equal(other,0);
        matrix.push({role,table,own,other});
      }
    }
    const prior=await scalar(c,'SELECT e2.household_id() AS value');
    await c.query("SELECT set_config('app.household_id','h2',false)");
    assert.equal(await scalar(c,'SELECT e2.household_id() AS value'),prior);
    const functionAttack=role==='assessment'?await fails(c,'SELECT e2.finalize_attempt($1,$2,$3,$4)',[learner,foreign.id,{answer:4},{correct:true}],'P0002'):
      await fails(c,'SELECT e2.finalize_attempt($1,$2,$3,$4)',[learner,foreign.id,{answer:4},{correct:true}],'42501');
    for(const table of [...tables,...views]) {
      // UPDATE privileges are absent on ordinary roles; this also covers views.
      const denied=await fails(c,`UPDATE e2.${table} SET household_id='h1' WHERE household_id='h2'`,[],'42501');
      matrix.push({role,table,write:denied});
    }
    matrix.push({role,tenantSettingIgnored:true,functionAttack});
  }
  // Exercise WITH CHECK independently of ordinary grants on every tenant table.
  // Each grant and positive insert is rolled back. Existing own rows are valid
  // positive controls with ON CONFLICT DO NOTHING; h2 must fail before conflict.
  const rls=[];
  for(const table of tables) {
    const row=(await admin.query(`SELECT to_jsonb(t) AS data FROM e2.${table} t WHERE household_id='h1' LIMIT 1`)).rows[0].data;
    for(const role of ROLES) {
      await admin.query('BEGIN');
      try {
        await admin.query(`GRANT SELECT,INSERT ON e2.${table} TO ${role}`);
        if(table==='content_revocations')await admin.query(`GRANT SELECT,INSERT,UPDATE ON e2.content_guards TO ${role}`);
        await admin.query(`SET SESSION AUTHORIZATION e2_h1_${role}`);
        await admin.query(`SET ROLE ${role}`);
        const sql=`INSERT INTO e2.${table} OVERRIDING SYSTEM VALUE SELECT (jsonb_populate_record(NULL::e2.${table},$1)).* ON CONFLICT DO NOTHING`;
        await admin.query(sql,[row]);
        await admin.query('SAVEPOINT negative');
        const error=await fails(admin,sql,[{...row,household_id:'h2'}],'42501');
        await admin.query('ROLLBACK TO SAVEPOINT negative');
        rls.push({role,table,positiveInsert:'h1 accepted; existing row conflict ignored',negativeInsert:error});
      } finally {
        await admin.query('ROLLBACK');await admin.query('RESET ROLE');await admin.query('RESET SESSION AUTHORIZATION');
      }
    }
  }
  for(const role of ROLES) {
    const c=await client(role);
    const privateMapping=await fails(c,'SELECT * FROM e2.principals',[],'42501');
    const migrationMetadata=await fails(c,'SELECT * FROM e2_migrations.applied',[],'42501');
    matrix.push({role,privateMapping,migrationMetadata,positiveBoundHousehold:await scalar(c,'SELECT e2.household_id() AS value')});
  }
  const catalog=(await admin.query("SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='e2' AND c.relkind='r' ORDER BY c.relname")).rows;
  assert(catalog.every(r=>r.relrowsecurity&&r.relforcerowsecurity));
  emit('3','household_matrix','each of four roles; owner only for fixture grant probe',{matrix,rls,catalog});
};
cases.c4=async()=> {
  const a=await client(); const second=await client(); const tutor=await client('tutor');
  const attempt=await issue(a);await submit(a,attempt);
  const firstPid=await scalar(a,'SELECT pg_backend_pid() AS value'); const secondPid=await scalar(second,'SELECT pg_backend_pid() AS value');
  await a.query('BEGIN');
  const first=await finalize(a,attempt);
  const competitor=finalize(second,attempt);competitor.catch(()=>{});
  const blocked=await waitBlocked(admin,secondPid,firstPid);
  await a.query('COMMIT');
  const retry=await competitor;
  assert.deepEqual(retry,first);assert.equal((await counts(a,attempt)).evidence_count,1);
  const conflict=await fails(second,'SELECT e2.finalize_attempt($1,$2,$3,$4)',[learner,attempt.id,{answer:5},{correct:true}],'P0001');
  emit('4','same_attempt_finalization','assessment/assessment',{blocked,first,retry,conflict,stored:await counts(a,attempt)});

  // Hold the first finalizer at SELECT FOR UPDATE before starting the second.
  const rowSkill=skill+'_row_boundary';const rowItem=await cloneItem('row_boundary',{skillId:rowSkill});
  const rowAttempt=await issue(a,{s:rowItem});await submit(a,rowAttempt);
  const rowOwner=await owner();clients.push(rowOwner);
  await rowOwner.query('BEGIN');await rowOwner.query('SELECT id FROM e2.attempts WHERE id=$1 FOR UPDATE',[rowAttempt.id]);
  const rowOwnerPid=await scalar(rowOwner,'SELECT pg_backend_pid() AS value');
  const rowFirst=finalize(a,rowAttempt);rowFirst.catch(()=>{});
  const attemptRowBlocked=await waitBlocked(admin,firstPid,rowOwnerPid);
  const rowSecond=finalize(second,rowAttempt);rowSecond.catch(()=>{});
  const rowSecondBlocked=await waitBlocked(admin,secondPid,firstPid);
  await rowOwner.query('COMMIT');const rowResults=await Promise.all([rowFirst,rowSecond]);
  assert.equal(rowResults[0].qualifying,true);assert.deepEqual(rowResults[0],rowResults[1]);assert.equal((await counts(a,rowAttempt)).evidence_count,1);
  emit('4','attempt_row_boundary','fixture owner holds row; assessment/assessment finalize',{attemptRowBlocked,rowSecondBlocked,results:rowResults});

  // A speculative first result rolls back while its competitor is blocked.
  const rollbackSkill=skill+'_rollback';const rollbackItem=await cloneItem('rollback',{skillId:rollbackSkill});
  const rollbackAttempt=await issue(a,{s:rollbackItem});await submit(a,rollbackAttempt);
  await a.query('BEGIN');const discarded=await finalize(a,rollbackAttempt);
  const afterRollback=finalize(second,rollbackAttempt);afterRollback.catch(()=>{});
  const rollbackBlocked=await waitBlocked(admin,secondPid,firstPid);
  await a.query('ROLLBACK');const surviving=await afterRollback;
  assert.equal(surviving.qualifying,true);assert.notEqual(surviving.evidenceId,discarded.evidenceId);
  assert.deepEqual(await finalize(a,rollbackAttempt),surviving);assert.equal((await counts(a,rollbackAttempt)).evidence_count,1);
  emit('4','concurrent_rollback_recovery','assessment/assessment',{blocked:rollbackBlocked,firstOutcome:'rolled_back',discarded,surviving,recovery:await finalize(a,rollbackAttempt)});

  // Different attempts on one fresh skill serialize their projection updates.
  const sharedSkill=skill+'_parallel';
  const pItem=await cloneItem('parallel_one',{skillId:sharedSkill});
  const qItem=await cloneItem('parallel_two',{skillId:sharedSkill});
  const pa=await issue(a,{s:pItem}),qa=await issue(second,{s:qItem});await submit(a,pa);await submit(second,qa);
  await a.query('BEGIN');const pr=await finalize(a,pa);
  const otherAttempt=finalize(second,qa);otherAttempt.catch(()=>{});
  const projectionBlocked=await waitBlocked(admin,secondPid,firstPid);
  await a.query('COMMIT');const qr=await otherAttempt;
  assert.equal(pr.qualifying,true);assert.equal(qr.qualifying,true);
  const projection=(await a.query('SELECT independent_successes,evidence_ids FROM e2.projections WHERE learner_id=$1 AND skill_id=$2',[learner,sharedSkill])).rows[0];
  assert.equal(projection.independent_successes,2);assert.deepEqual([...projection.evidence_ids].sort(),[pr.evidenceId,qr.evidenceId].sort());
  emit('4','different_attempts_projection','assessment/assessment',{blocked:projectionBlocked,first:pr,second:qr,projection});

  // Hold assistance before issue's shared skill boundary, then before submit.
  const issueSkill=skill+'_issue_boundary';const issueItem=await cloneItem('issue_boundary',{skillId:issueSkill});
  await tutor.query('BEGIN');const preIssueHelp=await exposure(tutor,{skills:[issueSkill]});
  const tutorPidAtIssue=await scalar(tutor,'SELECT pg_backend_pid() AS value');
  const issuing=issue(second,{s:issueItem});issuing.catch(()=>{});
  const issueBlocked=await waitBlocked(admin,secondPid,tutorPidAtIssue);
  await tutor.query('COMMIT');const issuedAfter=await issuing;
  assert.equal(issuedAfter.assistance_latched,false);assert.equal(issuedAfter.exposure_seq,preIssueHelp.causal_sequences[issueSkill]);
  await tutor.query('BEGIN');const submitHelp=await exposure(tutor,{skills:[issueSkill]});
  const submitting=submit(second,issuedAfter);submitting.catch(()=>{});
  const submitBlocked=await waitBlocked(admin,secondPid,tutorPidAtIssue);
  await tutor.query('COMMIT');const submittedAfter=await submitting;
  assert.equal(submittedAfter.assistance_latched,true);assert.deepEqual(submittedAfter.response,{answer:4});
  const refused=await finalize(second,issuedAfter);assert.equal(refused.qualifying,false);assert(refused.reasons.includes('assistance_observed'));
  emit('4','issue_submit_boundaries','tutor/assessment',{issueBlocked,submitBlocked,preIssueHelp:{id:preIssueHelp.id,sequences:preIssueHelp.causal_sequences},submitHelp:{id:submitHelp.id,sequences:submitHelp.causal_sequences},issuedAfter:{state:issuedAfter.state,assistance_latched:issuedAfter.assistance_latched},submittedAfter:{state:submittedAfter.state,assistance_latched:submittedAfter.assistance_latched,response:submittedAfter.response},refused,positiveFreshSkillResults:[pr,qr]});

  // Approval withdrawal wins the content lock before finalization starts. The
  // serializable helper must retry its stale snapshot and observe the withdrawal.
  const revokeSkill=skill+'_revocation';const revokeItem=await cloneItem('revocation_race',{skillId:revokeSkill});
  const revokeAttempt=await issue(a,{s:revokeItem});await submit(a,revokeAttempt);
  const revoker=await owner();clients.push(revoker);
  await revoker.query('BEGIN');
  await revoker.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','item',$1,'1','concurrent fixture withdrawal','{}')",[revokeItem]);
  const revokerPid=await scalar(revoker,'SELECT pg_backend_pid() AS value');const revokeRuns=[];
  const revokingFinalization=transaction(second,async(c,n)=>{revokeRuns.push(n);return finalize(c,revokeAttempt);});revokingFinalization.catch(()=>{});
  const revokeBlocked=await waitBlocked(admin,secondPid,revokerPid);
  await revoker.query('COMMIT');const revocationResult=await revokingFinalization;
  assert.equal(revocationResult.qualifying,false);assert(revocationResult.reasons.includes('content_not_approved'));assert.deepEqual(revokeRuns,[0,1]);
  emit('4','approval_revocation_boundary','owner content reviewer/assessment serializable',{blocked:revokeBlocked,runs:revokeRuns,result:revocationResult,positiveApproved:pr});

  // Provider latency: hold the actual call before SQL finalization, let assistance
  // commit, then resume. Equal timestamps are forced by an owner-only fixture
  // trigger without altering the production clock function.
  const latency=gate(); const held=await issue(a,{suffix:'_second'});await submit(a,held);
  await admin.query(`CREATE FUNCTION e2.fixture_equal_timestamp_${run}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.received_at:='2026-01-01T00:00:00Z'::timestamptz; RETURN NEW; END; $$`);
  await admin.query(`CREATE TRIGGER fixture_equal_timestamp_${run} BEFORE INSERT ON e2.exposure_events FOR EACH ROW EXECUTE FUNCTION e2.fixture_equal_timestamp_${run}()`);
  await admin.query(`CREATE TRIGGER fixture_equal_timestamp_${run} BEFORE INSERT ON e2.evidence_events FOR EACH ROW EXECUTE FUNCTION e2.fixture_equal_timestamp_${run}()`);
  let help,result;
  try {
    const grading=(async()=>{await latency.wait();return finalize(a,held);})();grading.catch(()=>{});
    await latency.entered;
    help=await exposure(tutor);
    latency.release();result=await grading;
  } finally {
    latency.release();
    await admin.query(`DROP TRIGGER fixture_equal_timestamp_${run} ON e2.exposure_events`);
    await admin.query(`DROP TRIGGER fixture_equal_timestamp_${run} ON e2.evidence_events`);
    await admin.query(`DROP FUNCTION e2.fixture_equal_timestamp_${run}()`);
  }
  assert.equal(result.qualifying,false);assert(result.reasons.includes('assistance_observed'));
  const event=(await a.query('SELECT received_at,causal_seq FROM e2.evidence_events WHERE attempt_id=$1',[held.id])).rows[0];
  assert.equal(new Date(help.received_at).toISOString(),event.received_at.toISOString());
  assert(BigInt(event.causal_seq)>BigInt(help.causal_sequences[skill]));
  emit('4','provider_boundary_equal_timestamps','assessment/tutor/assessment',{barrier:{kind:'javascript_gate_before_finalize',heldPid:firstPid,competitorPid:tutorPidAtIssue},positiveBeforeHelp:first,help:{received_at:help.received_at,causal_sequences:help.causal_sequences},event,result});

  // Assistance acquires the skill lock and latches before finalization starts.
  const latched=await issue(a);await submit(a,latched);
  await tutor.query('BEGIN');await exposure(tutor);
  const tutorPid=await scalar(tutor,'SELECT pg_backend_pid() AS value');
  const finalizing=finalize(second,latched);finalizing.catch(()=>{});
  const helpBlocked=await waitBlocked(admin,secondPid,tutorPid);
  await tutor.query('COMMIT');const assisted=await finalizing;
  assert.equal(assisted.qualifying,false);assert(assisted.reasons.includes('assistance_observed'));
  emit('4','assistance_lock_boundary','tutor/assessment',{blocked:helpBlocked,result:assisted});

  // Finalization wins before a subsequent assistance write. The assistance
  // call is held by PostgreSQL until that result commits; retry retains history.
  const laterSkill=skill+'_later';const laterItem=await cloneItem('later_help',{skillId:laterSkill});
  const completed=await issue(a,{s:laterItem});await submit(a,completed);
  await a.query('BEGIN');const completedResult=await finalize(a,completed);
  const laterHelp=exposure(tutor,{skills:[laterSkill]});laterHelp.catch(()=>{});
  const laterBlocked=await waitBlocked(admin,tutorPid,firstPid);
  await a.query('COMMIT');const laterEvent=await laterHelp;
  const history=await finalize(second,completed);assert.deepEqual(history,completedResult);assert.equal(history.qualifying,true);
  emit('4','later_assistance_preserves_completed_result','assessment/tutor/assessment',{blocked:laterBlocked,completedResult,laterEventId:laterEvent.id,retry:history});

  // Rollback failure at projection write (after evidence insert + attempt update).
  const partial=await issue(a);await submit(a,partial);
  await admin.query(`CREATE FUNCTION e2.fixture_fail_${run}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected projection failure' USING ERRCODE='P0001'; END; $$`);
  await admin.query(`CREATE TRIGGER fixture_fail_${run} BEFORE INSERT OR UPDATE ON e2.projections FOR EACH ROW EXECUTE FUNCTION e2.fixture_fail_${run}()`);
  let injected;
  try { injected=await fails(a,'SELECT e2.finalize_attempt($1,$2,$3,$4)',[learner,partial.id,{answer:4},{correct:true}],'P0001'); }
  finally {await admin.query(`DROP TRIGGER fixture_fail_${run} ON e2.projections`);await admin.query(`DROP FUNCTION e2.fixture_fail_${run}()`);}
  const failed=await counts(a,partial);assert.equal(failed.state,'submitted');assert.equal(failed.evidence_count,0);assert.deepEqual(failed.response,{answer:4});assert.equal(failed.final_result,null);
  let ackError;
  try {await finalize(a,partial);const lost=new Error('injected caller acknowledgment loss after SQL commit');lost.code='ACK_LOST';throw lost;}
  catch(e) {assert.equal(e.code,'ACK_LOST');ackError={code:e.code,message:e.message};}
  const recovered=(await counts(second,partial)).final_result;const repeated=await finalize(second,partial);assert.deepEqual(repeated,recovered);assert.equal((await counts(a,partial)).evidence_count,1);
  emit('4','partial_failure_and_lost_ack_retry','assessment/assessment',{injected,afterFailure:failed,ackError,recovered,repeated,afterRecovery:await counts(a,partial)});

  // Actual PostgreSQL serialization failure: the first transaction reads then
  // waits; a second connection commits an update; first update sees 40001.
  const x=await owner(),y=await owner();clients.push(x,y);
  const retryPids={heldPid:await scalar(x,'SELECT pg_backend_pid() AS value'),competitorPid:await scalar(y,'SELECT pg_backend_pid() AS value')};
  const scratch='e2_retry_'+run;
  await admin.query(`CREATE SCHEMA ${scratch}`);
  await admin.query(`CREATE TABLE ${scratch}.counter(id int PRIMARY KEY,value int NOT NULL)`);
  await admin.query(`INSERT INTO ${scratch}.counter VALUES(1,0)`);
  const entered=gate();const runs=[],errors=[];
  try {
    const serial=transaction(x,async(c,n)=>{
      runs.push(n);
      await c.query(`SELECT value FROM ${scratch}.counter WHERE id=1`);
      if(n===0)await entered.wait();
      try {return await scalar(c,`UPDATE ${scratch}.counter SET value=value+1 WHERE id=1 RETURNING value`);}
      catch(e) {errors.push({code:e.code,message:e.message});throw e;}
    });serial.catch(()=>{});
    await entered.entered;
    await y.query(`UPDATE ${scratch}.counter SET value=value+1 WHERE id=1`);
    entered.release();
    const value=await serial;
    assert.equal(value,2);assert.deepEqual(runs,[0,1]);assert.equal(errors[0].code,'40001');
    const recovery=await transaction(x,c=>scalar(c,`UPDATE ${scratch}.counter SET value=value+1 WHERE id=1 RETURNING value`));
    assert.equal(recovery,3);
    emit('4','serializable_retry','owner/owner, isolated counter fixture',{barrier:{kind:'javascript_gate_after_serializable_read',...retryPids},runs,errors,value,recovery});
  } finally {entered.release();await admin.query(`DROP SCHEMA ${scratch} CASCADE`);}

};
cases.c5=async()=>require('./offers.cjs')({admin,client,scalar,fails,emit,learner,skill,exposure,waitBlocked});
cases.c6=async()=>require('./interfaces.cjs')({admin,client,scalar,fails,emit,learner,skill,item,issue,submit,finalize,exposure,cloneItem,approveItem,waitBlocked});
cases.c7=async()=>{
  // item_presentations shows only approved, unrevoked items (migration 0008,
  // issue #10 item 2). Assessment reads e2.items directly when it needs drafts.
  const revocable=await cloneItem('presentation_revoked',{skillId:skill+'_presentation'});
  const roles=[];
  const count=(c,id)=>scalar(c,"SELECT count(*)::int AS value FROM e2.item_presentations WHERE household_id='h1' AND id=$1 AND version='1'",[id]);
  for(const role of ROLES) {
    const c=await client(role);
    const approved=await count(c,item);assert.equal(approved,1,role+' approved item is the positive control');
    const beforeRevocation=await count(c,revocable);assert.equal(beforeRevocation,1,role+' clone visible before revocation');
    const draft=await count(c,item+'_draft');assert.equal(draft,0,role+' sees a draft item');
    roles.push({role,approved,beforeRevocation,draft});
  }
  await admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','item',$1,'1','fixture withdrawal','{}')",[revocable]);
  for(const entry of roles) {
    const c=await client(entry.role);
    entry.revoked=await count(c,revocable);assert.equal(entry.revoked,0,entry.role+' sees a revoked item');
    entry.approvedAfter=await count(c,item);assert.equal(entry.approvedAfter,1);
    entry.answerKeyColumn=await fails(c,'SELECT answer_key FROM e2.item_presentations',[],'42703');
  }
  const options=(await admin.query("SELECT reloptions::text AS value FROM pg_class WHERE oid='e2.item_presentations'::regclass")).rows[0].value;
  assert(options.includes('security_invoker=true')&&options.includes('security_barrier=true'),options);
  emit('7','item_presentations_approved_only','learner/tutor/report/assessment; owner revokes',{roles,viewOptions:options});
};
async function main() {
  const requested=process.argv.find(a=>/^--case=/.test(a))?.slice(7);
  if(requested&&!cases[requested])throw new Error('unknown criterion '+requested);
  if(!requested) {
    // Each criterion gets fresh synthetic IDs, connections and setup. A prior
    // familiarity/exposure case cannot contaminate another positive control.
    const {spawnSync}=require('node:child_process');
    let failed=0;
    for(const name of Object.keys(cases)) {
      const result=spawnSync(process.execPath,[__filename,'--case='+name],{stdio:'inherit',timeout:120000});
      if(result.status!==0)failed++;
    }
    console.log(JSON.stringify({suite:'native PostgreSQL authority',criteria:Object.keys(cases).length,failed}));
    if(failed)process.exitCode=1;
    return;
  }
  console.log(JSON.stringify({harness:'sh tests/engine/pg/up.sh && node tests/engine/pg/prove.cjs'+(requested?' --case='+requested:''),targetDatabase:'native PostgreSQL 17.11',run,plannedRoles:'dedicated household/capability LOGIN then SET ROLE'}));
  let completed=0;
  try {
    await seed();
    for(const [name,test] of Object.entries(cases)) {if(requested&&name!==requested)continue;await test();completed++;console.log(JSON.stringify({case:name,status:'PASS'}));}
    console.log(JSON.stringify({status:'PASS',completed}));
  } finally {await Promise.all(clients.map(c=>c.end().catch(()=>{})));if(admin)await admin.end();}
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({status:pgConnected?'FAIL':'BLOCKED',pgConnected,error:e.message,code:e.code??null,stack:e.stack}));process.exitCode=1;});
module.exports={cases};
