'use strict';
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {transaction,owner}=require('./harness.cjs');
module.exports=async function({admin,client,scalar,fails,emit,learner,skill,item,issue,submit,finalize,exposure,cloneItem,approveItem,waitBlocked}) {
  const a=await client(),t=await client('tutor');
  const signature=await scalar(admin,"SELECT to_regprocedure('e2.rebuild_projection(text,text)')::text AS value");
  assert.equal(signature,'e2.rebuild_projection(text,text)');
  // Every transition has an immutable event, and retries add nothing.
  const attempt=await issue(a), issuedRetry=await scalar(a,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7) AS value',[learner,item,'1',attempt.operation_id,attempt.session_id,attempt.scorer_id,attempt.scorer_version]);
  assert.equal(issuedRetry.id,attempt.id);
  await submit(a,attempt);await submit(a,attempt);const result=await finalize(a,attempt);await finalize(a,attempt);
  const audit=(await a.query('SELECT state,count(*)::int AS n FROM e2.attempt_events WHERE attempt_id=$1 GROUP BY state ORDER BY CASE state WHEN \'issued\' THEN 1 WHEN \'submitted\' THEN 2 ELSE 3 END',[attempt.id])).rows;
  assert.deepEqual(audit.map(x=>x.n),[1,1,1]);
  const auditDenials=[];
  for(const sql of ['UPDATE e2.attempt_events SET state=state WHERE false','DELETE FROM e2.attempt_events WHERE false','TRUNCATE e2.attempt_events'])auditDenials.push(await fails(admin,sql,[],'55000'));
  const other=await client('assessment','h2');
  assert.equal(await scalar(other,'SELECT count(*)::int AS value FROM e2.attempt_events WHERE attempt_id=$1',[attempt.id]),0);
  for(const role of ['learner','tutor','report','assessment']) {
    const c=await client(role);
    assert.equal(await scalar(c,'SELECT count(*)::int AS value FROM e2.attempt_events WHERE attempt_id=$1',[attempt.id]),3);
    await fails(c,'UPDATE e2.attempt_events SET state=state WHERE false',[],'42501');
  }
  emit('6','immutable_attempt_transition_events','owner/all roles',{audit,counts:audit.map(x=>x.n),retryAppended:0,auditDenials});

  // Projection rebuild preserves exact contributing IDs and frozen rule partitions.
  const before=(await a.query('SELECT * FROM e2.report_projection WHERE learner_id=$1 AND skill_id=$2',[learner,skill])).rows;
  const rebuilt=await scalar(a,'SELECT e2.rebuild_projection($1,$2) AS value',[learner,skill]);
  assert.deepEqual(rebuilt.map(x=>x.evidence_ids),before.map(x=>x.evidence_ids));
  const rule='rule72_'+randomUUID();
  await admin.query("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES('h1',$1,'{\"delayHours\":72}','{}')",[rule]);
  const item72=await cloneItem('rule72');
  const a72=await scalar(a,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7,$8) AS value',[learner,item72,'1',randomUUID(),'rule72','fixture-scorer','1',rule]);
  await submit(a,a72);const r72=await finalize(a,a72);assert.equal(r72.qualifying,true);
  await admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','item',$1,'1','post-hoc c6','{}')",[item]);
  const withdrawn=await scalar(a,'SELECT e2.rebuild_projection($1) AS value',[learner]);
  const old=withdrawn.find(x=>x.skill_id===skill&&x.rule_version==='e2-draft-1');
  const newer=withdrawn.find(x=>x.skill_id===skill&&x.rule_version===rule);
  assert.deepEqual(old.evidence_ids,[]);assert.equal(old.independent_successes,0);assert.deepEqual(newer.evidence_ids,[r72.evidenceId]);
  assert.deepEqual(await finalize(a,attempt),result);
  const afterItem=await cloneItem('after_rebuild');const afterAttempt=await issue(a,{s:afterItem});await submit(a,afterAttempt);const afterResult=await finalize(a,afterAttempt);
  const afterProjection=await scalar(a,"SELECT to_jsonb(p) AS value FROM e2.projections p WHERE learner_id=$1 AND skill_id=$2 AND rule_version='e2-draft-1'",[learner,skill]);
  assert.deepEqual(afterProjection.evidence_ids,[afterResult.evidenceId]);
  // A dedicated rubric can be revoked and committed without touching other
  // cases; assessment rebuilds in a separate transaction in the documented order.
  const dedicatedRubric='rubric_'+randomUUID(),dedicatedItem='item_'+randomUUID(),dedicatedSkill=skill+'_rubric';
  await admin.query("INSERT INTO e2.rubrics(household_id,id,version,approval,content,provenance) VALUES('h1',$1,'1','approved','{}','{}')",[dedicatedRubric]);
  await admin.query("INSERT INTO e2.items SELECT household_id,$1,version,key_version,$2,rubric_version,$3,skill_version,family_id,context_tag,approval,content,answer_key,provenance FROM e2.items WHERE household_id='h1' AND id=$4",[dedicatedItem,dedicatedRubric,dedicatedSkill,item]);
  await approveItem(admin,dedicatedItem);
  const rubricAttempt=await issue(a,{s:dedicatedItem});await submit(a,rubricAttempt);const rubricResult=await finalize(a,rubricAttempt);assert.equal(rubricResult.qualifying,true);
  await admin.query("INSERT INTO e2.content_revocations(household_id,target_kind,target_id,target_version,reason,provenance) VALUES('h1','rubric',$1,'1','c6 committed rubric withdrawal','{}')",[dedicatedRubric]);
  const rubricRebuilt=await scalar(a,'SELECT e2.rebuild_projection($1,$2) AS value',[learner,dedicatedSkill]);
  assert.deepEqual(rubricRebuilt[0].evidence_ids,[]);
  assert.deepEqual(await finalize(a,rubricAttempt),rubricResult);
  emit('6','E11_rebuild_revocation_and_rule_versions','assessment',{before:before.map(x=>x.evidence_ids),unchanged:rebuilt.map(x=>x.evidence_ids),withdrawn,rubricRebuilt,afterLaterFinalize:afterProjection.evidence_ids,retainedResult:result});

  const transitions=[];
  for(const state of ['expired','cancelled'])for(const initial of ['issued','submitted']) {
    const candidate=await issue(a,{s:await cloneItem(state+initial)});
    if(initial==='submitted')await submit(a,candidate);
    const fn=state==='expired'?'expire_attempt':'cancel_attempt';
    const sql=`SELECT e2.${fn}($1,$2) AS value`;
    const row=await scalar(a,sql,[learner,candidate.id]);assert.equal(row.state,state);
    assert.deepEqual(await scalar(a,sql,[learner,candidate.id]),row);
    const refused=await fails(a,'SELECT e2.finalize_attempt($1,$2,$3,$4)',[learner,candidate.id,{answer:4},{correct:true}],'P0001');
    const evidence=await scalar(a,'SELECT count(*)::int AS value FROM e2.evidence_events WHERE attempt_id=$1',[candidate.id]);assert.equal(evidence,0);
    const events=(await a.query('SELECT state FROM e2.attempt_events WHERE attempt_id=$1 ORDER BY event_order',[candidate.id])).rows.map(x=>x.state);
    assert.deepEqual(events,initial==='issued'?['issued',state]:['issued','submitted',state]);
    transitions.push({initial,state,evidence,events,refused});
  }
  emit('6','expire_cancel_retry_and_finalize_refusal','assessment',{transitions});

  // Owner opts this DB into fixture mode only inside the transaction below.
  // Protected setter tags the transaction and uses set_config(..., true).
  const boundaries=[];
  const ownerLogin=await scalar(admin,'SELECT session_user::text AS value');
  await admin.query('BEGIN');
  try {
    await admin.query('INSERT INTO e2.principals(login,household_id) VALUES($1,\'h1\') ON CONFLICT(login) DO UPDATE SET household_id=EXCLUDED.household_id',[ownerLogin]);
    await admin.query('UPDATE e2.fixture_control SET enabled=true WHERE singleton');
    await admin.query("SET LOCAL e2.fixture_clock='2000-01-01T00:00:00Z'");
    const unarmed=await scalar(admin,'SELECT e2.operation_clock() AS value');
    assert(+unarmed>Date.parse('2026-02-01'));

    for(const delta of [-1,0,1]) {
      const boundarySkill=skill+'_clock_'+delta;
      // Clone in the same owner transaction so all fixture-only state rolls back.
      const boundaryItem=item+'_clock_'+delta;
      await admin.query("INSERT INTO e2.items SELECT household_id,$1,version,key_version,rubric_id,rubric_version,$2,skill_version,family_id,context_tag,approval,content,answer_key,provenance FROM e2.items WHERE household_id='h1' AND id=$3",[boundaryItem,boundarySkill,item]);
      await approveItem(admin,boundaryItem);
      await admin.query("SELECT e2.set_fixture_clock('2026-01-01T00:00:00Z')");
      const help=await exposure(admin,{skills:[boundarySkill]});
      const clock=new Date(Date.parse('2026-01-03T00:00:00Z')+delta).toISOString();
      await admin.query('SELECT e2.set_fixture_clock($1)',[clock]);
      const candidate=await issue(admin,{s:boundaryItem});await submit(admin,candidate);const observed=await finalize(admin,candidate);
      assert.equal(Date.parse(candidate.issued_at)-Date.parse(help.received_at),48*3600000+delta);
      assert.equal(observed.qualifying,delta>=0);
      boundaries.push({millisecondsFrom48h:delta,issuedAt:candidate.issued_at,exposureAt:help.received_at,result:observed});
    }
    const ruleBoundaries=[];
    for(const hours of [48,72]) {
      const boundarySkill=skill+'_rule_clock_'+hours,boundaryItem=item+'_rule_clock_'+hours;
      await admin.query("INSERT INTO e2.items SELECT household_id,$1,version,key_version,rubric_id,rubric_version,$2,skill_version,family_id,context_tag,approval,content,answer_key,provenance FROM e2.items WHERE household_id='h1' AND id=$3",[boundaryItem,boundarySkill,item]);
      await approveItem(admin,boundaryItem);
      await admin.query("SELECT e2.set_fixture_clock('2026-01-01T00:00:00Z')");
      await exposure(admin,{skills:[boundarySkill]});
      await admin.query('SELECT e2.set_fixture_clock($1)',[new Date(Date.parse('2026-01-01T00:00:00Z')+hours*3600000).toISOString()]);
      const candidate=await scalar(admin,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7,$8) AS value',[learner,boundaryItem,'1',randomUUID(),'rule-clock','fixture-scorer','1',rule]);
      await submit(admin,candidate);const observed=await finalize(admin,candidate);
      assert.equal(observed.qualifying,hours===72);
      const rebuilt=await scalar(admin,'SELECT e2.rebuild_projection($1,$2) AS value',[learner,boundarySkill]);
      assert.equal(rebuilt[0].rule_version,rule);assert.equal(rebuilt[0].independent_successes,hours===72?1:0);
      ruleBoundaries.push({hours,rule,qualifying:observed.qualifying,contributingIds:rebuilt[0].evidence_ids});
    }
    emit('6','frozen_72_hour_rule_rebuild','owner fixture',{unarmedClockIgnored:unarmed,ruleBoundaries});
    // An owner connection SET ROLE assessment must also ignore the fixture clock.
    await admin.query('SET LOCAL ROLE assessment');
    const impersonated=await scalar(admin,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7) AS value',[learner,item72,'1',randomUUID(),'clock-role','s','1']);
    assert(Date.parse(impersonated.issued_at)>Date.parse('2026-02-01'));
    boundaries.push({ownerSetRoleAssessmentIgnored:impersonated.issued_at});
  } finally {await admin.query('ROLLBACK');}
  const appItem=await cloneItem('app_clock',{skillId:skill+'_app_clock'});
  const spoof=await transaction(a,async c=> {
    await c.query("SET LOCAL e2.fixture_clock='2000-01-01T00:00:00Z'");
    const before=await scalar(c,'SELECT clock_timestamp() AS value');
    const candidate=await issue(c,{s:appItem});await submit(c,candidate);await finalize(c,candidate);
    const after=await scalar(c,'SELECT clock_timestamp() AS value');
    const stored=await scalar(c,'SELECT to_jsonb(a) AS value FROM e2.attempts a WHERE id=$1',[candidate.id]);
    for(const timestamp of [stored.issued_at,stored.submitted_at,stored.finalized_at])assert(Date.parse(timestamp)>=+before&&Date.parse(timestamp)<=+after);
    return {guc:await scalar(c,"SELECT current_setting('e2.fixture_clock') AS value"),before,after,issuedAt:stored.issued_at,submittedAt:stored.submitted_at,finalizedAt:stored.finalized_at,ignored:true};
  });
  await fails(a,"SELECT e2.set_fixture_clock('2000-01-01')",[],'42501');
  emit('6','E02_fixture_clock_boundaries_and_application_spoof','owner/assessment',{boundaries,spoof});

  const check=randomUUID(),session='practice_'+randomUUID(),practiceSkill=skill+'_practice';
  const queueSql='SELECT e2.queue_practice_check($1,$2,$3,$4,$5) AS value';
  const queued=await scalar(t,queueSql,[learner,practiceSkill,'1',check,session]);
  assert.deepEqual(await scalar(t,queueSql,[learner,practiceSkill,'1',check,session]),queued);
  const sql='SELECT e2.practice_check($1,$2,$3,$4,$5,$6,$7) AS value';
  const args=[learner,practiceSkill,'1',randomUUID(),session,{checkId:check,correct:true,qualifying:true},{source:'synthetic'}];
  await assert.rejects(transaction(t,async c=> {
    const rolledBack=await scalar(c,sql,args);assert.equal(rolledBack.ok,true);
    throw new Error('rollback the practice answer');
  }),/rollback the practice answer/);
  assert.equal(await scalar(a,'SELECT count(*)::int AS value FROM e2.evidence_events WHERE practice_check_id=$1',[queued.id]),0);
  for(const role of ['learner','report']) {
    const c=await client(role);
    await fails(c,sql,args,'42501');await fails(c,queueSql,[learner,practiceSkill,'1',check,session],'42501');
  }
  const first=await client('tutor'),second=await client('assessment');
  let pending;
  await first.query('BEGIN');
  try {
    const one=await scalar(first,sql,args);assert.equal(one.ok,true);assert.equal(one.evidence.qualifying,false);assert.equal(one.evidence.class,'corrections-practice');
    pending=transaction(second,c=>scalar(c,sql,[...args.slice(0,3),randomUUID(),...args.slice(4)]));pending.catch(()=>{});
    const barrier=await waitBlocked(admin,second.fixtureIdentity.pid,first.fixtureIdentity.pid);
    assert.equal(barrier.wait_event,'advisory');
    await first.query('COMMIT');
    const two=await pending;assert.deepEqual(two,{ok:false,code:'NO_PENDING_CHECK'});
    const rows=(await a.query('SELECT id,class,qualifying FROM e2.evidence_events WHERE practice_check_id=$1',[queued.id])).rows;
    assert.equal(rows.length,1);
    assert.deepEqual(await scalar(t,sql,args),{ok:false,code:'NO_PENDING_CHECK'});
    emit('6','practice_check_two_connection_lock_boundary','tutor/assessment',{barrier,outcomes:[one,two],rows,retryAppended:0,rollbackRetainedPending:true});
  } finally {await first.query('ROLLBACK');if(pending)await pending.catch(()=>{});}
  const apis=[
    {name:'rebuild_projection',sql:'SELECT e2.rebuild_projection($1,$2)',args:[learner,skill],roles:['assessment']},
    {name:'expire_attempt',sql:'SELECT e2.expire_attempt($1,$2)',args:[learner,attempt.id],roles:['assessment']},
    {name:'cancel_attempt',sql:'SELECT e2.cancel_attempt($1,$2)',args:[learner,attempt.id],roles:['assessment']},
    {name:'queue_practice_check',sql:queueSql,args:[learner,practiceSkill,'1',check,session],roles:['tutor','assessment']},
    {name:'practice_check',sql,args,roles:['tutor','assessment']},
  ];
  const matrix=[];
  for(const api of apis) {
    const metadata=(await admin.query("SELECT p.oid,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='e2' AND p.proname=$1",[api.name])).rows[0];
    assert.equal(metadata.owner,'e2_writer');assert.equal(metadata.prosecdef,true);assert.deepEqual(metadata.proconfig,['search_path=pg_catalog']);
    for(const role of ['learner','tutor','report','assessment']) {
      const allowed=await scalar(admin,"SELECT has_function_privilege($1,$2,'EXECUTE') AS value",[role,metadata.oid]);
      assert.equal(allowed,api.roles.includes(role));
      const refused=allowed?null:await fails(await client(role),api.sql,api.args,'42501');
      matrix.push({function:api.name,role,allowed,owner:metadata.owner,refused});
    }
  }
  const foreign=[];
  for(const fn of ['expire_attempt','cancel_attempt'])foreign.push({function:fn,...await fails(other,`SELECT e2.${fn}($1,$2)`,[learner,attempt.id],'P0002')});
  assert.deepEqual(await scalar(other,'SELECT e2.rebuild_projection($1,$2) AS value',[learner,skill]),[]);
  assert.deepEqual(await scalar(other,sql,args),{ok:false,code:'NO_PENDING_CHECK'});
  assert.equal(await scalar(other,'SELECT count(*)::int AS value FROM e2.practice_checks WHERE id=$1',[queued.id]),0);
  assert.equal(await scalar(other,'SELECT count(*)::int AS value FROM e2.evidence_events WHERE practice_check_id=$1',[queued.id]),0);
  for(const table of ['practice_checks','fixture_control','fixture_clock_transactions'])await fails(a,`UPDATE e2.${table} SET ${table==='practice_checks'?'check_id=check_id':table==='fixture_control'?'enabled=true':'backend_pid=backend_pid'} WHERE false`,[],'42501');
  emit('6','new_api_ownership_capability_and_household_matrix','all roles',{matrix,foreign,foreignProjection:[],foreignPractice:'NO_PENDING_CHECK'});
  const orderSkill=skill+'_content_order',otherLearner=learner+'_content_order';
  await admin.query("INSERT INTO e2.learners(household_id,id) VALUES('h1',$1)",[otherLearner]);
  const low=await cloneItem('order_a',{skillId:orderSkill}),high=await cloneItem('order_b',{skillId:orderSkill});
  const pair=await client(),left=await client(),right=await client();
  const candidates={};
  for(const l of [learner,otherLearner])for(const id of [low,high]) {
    const candidate=await scalar(pair,'SELECT e2.issue_attempt($1,$2,$3,$4,$5,$6,$7) AS value',[l,id,'1',randomUUID(),'order','s','1']);
    await scalar(pair,'SELECT e2.submit_attempt($1,$2,$3) AS value',[l,candidate.id,{answer:4}]);
    candidates[l+id]=candidate;
  }
  const holder=await owner();let firstFinalize,secondFinalize;
  try {
    const holderPid=await scalar(holder,'SELECT pg_backend_pid() AS value');
    await holder.query('BEGIN');
    // Holding the high item makes an old current-item-first finalizer wait
    // before it holds low; its competitor would hold low and later wait high.
    // Sorted content acquisition instead makes the first own low before waiting.
    await holder.query("SELECT revision FROM e2.content_guards WHERE household_id='h1' AND target_kind='item' AND target_id=$1 AND target_version='1' FOR UPDATE",[high]);
    const run=(c,l,id)=>transaction(c,tx=>scalar(tx,'SELECT e2.finalize_attempt($1,$2,$3,$4) AS value',[l,candidates[l+id].id,{answer:4},{correct:true}]),{isolation:'read committed',retries:0});
    firstFinalize=run(left,learner,high);firstFinalize.catch(()=>{});
    const held=await waitBlocked(admin,left.fixtureIdentity.pid,holderPid);
    secondFinalize=run(right,otherLearner,low);secondFinalize.catch(()=>{});
    const ordered=await waitBlocked(admin,right.fixtureIdentity.pid,left.fixtureIdentity.pid);
    await holder.query('COMMIT');
    const outcomes=await Promise.all([firstFinalize,secondFinalize]);
    assert(outcomes.every(r=>r.qualifying));
    emit('6','two_learners_shared_content_lock_order','assessment/assessment; owner boundary holder',{held,ordered,outcomes,retries:0});
  } finally {
    await holder.query('ROLLBACK');await holder.end();
    await Promise.all([firstFinalize,secondFinalize].filter(Boolean).map(p=>p.catch(()=>{})));
  }
};
