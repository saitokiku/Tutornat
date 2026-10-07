'use strict';
// Native c5 contract. Removing locking, sequence checks, immutable fields or
// capability restrictions must change the observed outcome, not just SQL text.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
module.exports=async function offers(ctx) {
  const {admin,client,scalar,fails,emit,learner,skill,exposure,waitBlocked}=ctx;
  const a=await client(), b=await client(), t=await client('tutor'), l=await client('learner');
  const sql='SELECT e2.offer_transition($1,$2,$3,$4,$5) AS value';
  const request=(extra={})=>({operationId:crypto.randomUUID(),...extra});
  const args=(s,kind,id=null,reason=request())=>[learner,s,kind,id,reason];
  const call=(c,x)=>scalar(c,sql,x);
  const count=(s,kind)=>scalar(a,'SELECT count(*)::int AS value FROM e2.assessment_offers WHERE learner_id=$1 AND skill_id=$2 AND kind=$3',[learner,s,kind]);
  async function reps(s,n=10) {
    await t.query("SELECT e2.append_practice($1,$2,'1',$3||n,'synthetic','{\"correct\":true,\"assisted\":false}','{}') FROM generate_series(1,$4::int) n",[learner,s,crypto.randomUUID(),n]);
  }
  async function race(name,x) {
    await a.query('BEGIN');
    let pending;
    try {
      const first=await call(a,x);
      pending=call(b,x);pending.catch(()=>{});
      const blocked=await waitBlocked(admin,b.fixtureIdentity.pid,a.fixtureIdentity.pid);
      await a.query('COMMIT');
      const retry=await pending;
      assert.deepEqual(retry,first);
      emit('5',name,'assessment/assessment',{blocked,first,retry});
      return first;
    } finally {await a.query('ROLLBACK');if(pending)await pending.catch(()=>{});}
  }
  // This assertion fails against merged main, before any offer implementation.
  assert.equal(await scalar(admin,"SELECT to_regprocedure('e2.offer_transition(text,text,text,uuid,jsonb)') IS NOT NULL AS value"),true,'offer_transition must exist');
  await reps(skill);
  const offered=await race('two_connection_offer_race',args(skill,'offer'));
  assert.equal(await count(skill,'offered'),1);
  assert.equal(await scalar(a,'SELECT count(*)::int AS value FROM e2.assessment_offers WHERE learner_id=$1 AND skill_id=$2 AND open',[learner,skill]),1);
  const taken=await race('two_connection_take_race',args(skill,'take',offered.id));
  assert.equal((await call(a,args(skill,'offer',null,offered.request))).open,false);
  assert.equal(await count(skill,'taken'),1);assert.equal(taken.offer_id,offered.id);
  assert.equal(await scalar(a,'SELECT open AS value FROM e2.assessment_offers WHERE id=$1',[offered.id]),false);
  const conflict=await fails(a,sql,args(skill,'take',offered.id,{...taken.request,note:'different'}),'P0001');
  await exposure(t);
  assert.deepEqual(await call(a,args(skill,'take',offered.id,taken.request)),taken);
  emit('5','retry_after_help_and_conflict','assessment',{taken,conflict});

  const distinct=skill+'_distinct';await reps(distinct);
  await a.query('BEGIN');let contender;
  try {
    const first=await call(a,args(distinct,'offer'));
    contender=fails(b,sql,args(distinct,'offer'),'P0001');
    const blocked=await waitBlocked(admin,b.fixtureIdentity.pid,a.fixtureIdentity.pid);
    await a.query('COMMIT');const conflict=await contender;
    assert.equal(await count(distinct,'offered'),1);
    emit('5','distinct_offer_operations_race','assessment/assessment',{blocked,first,conflict});
  } finally {await a.query('ROLLBACK');if(contender)await contender;}
  const stale=skill+'_stale';await reps(stale);
  // Existing guard prevents INSERT visibility from being the only conflict.
  await b.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    await b.query('SELECT causal_seq FROM e2.skill_guards WHERE learner_id=$1 AND skill_id=$2',[learner,stale]);
    const winner=await call(a,args(stale,'offer'));
    const refused=await fails(b,sql,args(stale,'offer'),'40001');
    emit('5','stale_repeatable_read_offer','assessment/assessment',{barrier:{kind:'snapshot_before_committed_offer',waiterPid:b.fixtureIdentity.pid,blockerPid:a.fixtureIdentity.pid},winner,refused});
  } finally {await b.query('ROLLBACK');}
  const helped=skill+'_help';await reps(helped);
  const offer=await call(a,args(helped,'offer'));
  await t.query('BEGIN');
  let pending;
  try {
    await exposure(t,{skills:[helped]});
    pending=fails(b,sql,args(helped,'take',offer.id),'P0001');
    const blocked=await waitBlocked(admin,b.fixtureIdentity.pid,t.fixtureIdentity.pid);
    await t.query('COMMIT');
    const refusal=await pending;assert.match(refusal.message,/help_after_offer/);assert.equal(JSON.parse(refusal.detail).reason,'help_after_offer');
    assert.equal(await count(helped,'taken'),0);
    // Even after the new quiet window elapses, that old offer stays invalid.
    await admin.query("UPDATE e2.skill_guards SET last_exposure_at=now()-interval '49 hours' WHERE household_id='h1' AND learner_id=$1 AND skill_id=$2",[learner,helped]);
    const afterDelay=await fails(a,sql,args(helped,'take',offer.id),'P0001');assert.match(afterDelay.message,/help_after_offer/);
    const restartArgs=args(helped,'restart',offer.id);
    const restarted=await call(l,restartArgs);assert.equal(restarted.kind,'restarted');
    assert.deepEqual(await call(l,restartArgs),restarted);
    assert.equal(await scalar(a,'SELECT open AS value FROM e2.assessment_offers WHERE id=$1',[offer.id]),false);
    emit('5','help_then_take_and_restart','tutor/assessment/learner',{blocked,refusal,afterDelay,restarted});
  } finally {await t.query('ROLLBACK');if(pending)await pending;}

  const same=skill+'_same_tx';await reps(same);
  const fn='fixture_offer_time_'+crypto.randomUUID().replaceAll('-','');
  // Owner-only fixture makes the guard receipt and offer time exactly equal.
  await admin.query(`CREATE FUNCTION e2.${fn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.last_exposure_at:=transaction_timestamp(); RETURN NEW; END $$`);
  await admin.query(`CREATE TRIGGER ${fn} BEFORE UPDATE OF exposure_seq ON e2.skill_guards FOR EACH ROW EXECUTE FUNCTION e2.${fn}()`);
  await a.query('BEGIN');
  try {
    const o=await call(a,args(same,'offer'));
    await exposure(a,{skills:[same]});
    const equal=await scalar(a,'SELECT last_exposure_at=$3::timestamptz AS value FROM e2.skill_guards WHERE learner_id=$1 AND skill_id=$2',[learner,same,o.at]);assert.equal(equal,true);
    await a.query('SAVEPOINT refusal');
    const refused=await fails(a,sql,args(same,'take',o.id),'P0001');assert.match(refused.message,/help_after_offer/);
    await a.query('ROLLBACK TO SAVEPOINT refusal');
    const r=await call(a,args(same,'restart',o.id));assert(r.exposure_seq>o.exposure_seq);
    await a.query('COMMIT');
    emit('5','same_transaction_equal_time_sequence','assessment',{offer:o,restart:r,equalTimestamps:equal,refused});
  } finally {await a.query('ROLLBACK');await admin.query(`DROP TRIGGER ${fn} ON e2.skill_guards`);await admin.query(`DROP FUNCTION e2.${fn}()`);}

  const delay=[];
  for(const micros of [-1,0,1]) {
    const s=skill+'_delay_'+micros;await reps(s);await exposure(t,{skills:[s]});
    await a.query('BEGIN');
    try {
      const now=await scalar(a,'SELECT now()::text AS value');
      await admin.query("UPDATE e2.skill_guards SET last_exposure_at=$3::timestamptz-interval '48 hours'-($4::int*interval '1 microsecond') WHERE household_id='h1' AND learner_id=$1 AND skill_id=$2",[learner,s,now,micros]);
      const x=args(s,'offer');
      const result=micros<0?await fails(a,sql,x,'P0001'):await call(a,x);
      delay.push({microsecondsFrom48h:micros,result});
    } finally {await a.query('ROLLBACK');}
  }
  emit('5','delay_boundary_at_pg_precision','assessment; owner clock fixture',{delay});

  const escalation=[];
  for(const micros of [-1,0,1,86400000000]) {
    const s=skill+'_escalation_'+micros;
    await exposure(t,{skills:[s]});
    await a.query('BEGIN');
    try {
      const now=await scalar(a,'SELECT now()::text AS value');
      // Seed append-only evidence at its historical receipt time, never UPDATE it.
      await admin.query("INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,received_at,payload,provenance,rule_version) SELECT 'h1',$1,$2||n,'fixture',$3,'1',n,'corrections-practice',false,$4::timestamptz-interval '14 days'-($5::bigint*interval '1 microsecond'),'{\"correct\":true}','{\"source\":\"synthetic-boundary\"}','e2-draft-1' FROM generate_series(1,10) n",[learner,crypto.randomUUID(),s,now,micros]);
      await admin.query("UPDATE e2.skill_guards SET causal_seq=greatest(causal_seq,10) WHERE household_id='h1' AND learner_id=$1 AND skill_id=$2",[learner,s]);
      const x=args(s,'escalate');
      const result=micros<0?await fails(a,sql,x,'P0001'):await call(a,x);
      if(micros>=0) {
        assert.equal(result.kind,'escalated');assert.match(result.reason.explanation,/quiet window/);assert.match(result.reason.plan,/48/);
        assert.deepEqual(await call(a,x),result);
      }
      escalation.push({microsecondsFrom14days:micros,result});
    } finally {await a.query('ROLLBACK');}
  }
  emit('5','escalation_boundary_and_beyond','assessment; owner historical fixture',{escalation});

  const refusals=[];
  const report=await client('report'),foreign=await client('assessment','h2');
  await foreign.query("SELECT e2.append_practice($1,$2,'1',$3||n,'synthetic','{\"correct\":true}','{}') FROM generate_series(1,10) n",[learner,skill,crypto.randomUUID()]);
  const foreignOffer=await call(foreign,args(skill,'offer'));assert.equal(foreignOffer.household_id,'h2');
  refusals.push(await fails(report,sql,args(skill,'offer'),'42501'));
  refusals.push(await fails(foreign,sql,args(skill,'take',offered.id),'P0002'));
  refusals.push(await fails(a,sql,args(skill,'take',crypto.randomUUID()),'P0002'));
  refusals.push(await fails(a,sql,['missing_'+learner,skill,'offer',null,request()],'P0002'));
  refusals.push(await fails(a,sql,args(skill+'_no_reps','offer'),'P0001'));
  for(const c of [a,t,l,report]) {
    refusals.push(await fails(c,'UPDATE e2.assessment_offers SET open=false WHERE id=$1',[offer.id],'42501'));
    refusals.push(await fails(c,'INSERT INTO e2.assessment_offers DEFAULT VALUES',[],'42501'));
    refusals.push(await fails(c,'SELECT e2.lock_skills($1,ARRAY[$2],$3)',[learner,skill,'1'],'42501'));
    assert.equal(await scalar(c,"SELECT count(*)::int AS value FROM e2.assessment_offers WHERE household_id='h2'"),0);
    assert((await scalar(c,'SELECT count(*)::int AS value FROM e2.assessment_offers WHERE learner_id=$1',[learner]))>0);
  }
  assert.equal(await scalar(foreign,'SELECT count(*)::int AS value FROM e2.assessment_offers WHERE id=$1',[offered.id]),0);
  const immutableSkill=skill+'_immutable';await reps(immutableSkill);const immutable=await call(t,args(immutableSkill,'offer'));
  for(const assignment of ["household_id='h2'","rule_version='forged'","offer_id=gen_random_uuid()","seq=DEFAULT","provenance='{}'","request='{}'","reason='{}'","operation_id='forged'"]) {
    refusals.push(await fails(admin,`UPDATE e2.assessment_offers SET open=false,${assignment} WHERE id=$1`,[immutable.id],'55000'));
  }
  refusals.push(await fails(admin,'DELETE FROM e2.assessment_offers WHERE id=$1',[immutable.id],'55000'));
  refusals.push(await fails(admin,'TRUNCATE e2.assessment_offers',[],'55000'));
  await admin.query('UPDATE e2.assessment_offers SET open=false WHERE id=$1',[immutable.id]);
  refusals.push(await fails(admin,'UPDATE e2.assessment_offers SET open=true WHERE id=$1',[immutable.id],'55000'));
  const malformed=skill+'_malformed';
  await t.query("SELECT e2.append_practice($1,$2,'1',$3||n,'synthetic','{\"correct\":\"true\",\"assisted\":\"false\"}','{}') FROM generate_series(1,10) n",[learner,malformed,crypto.randomUUID()]);
  refusals.push(await fails(a,sql,args(malformed,'offer'),'P0001'));
  const configured=skill+'_configured';await reps(configured);await exposure(t,{skills:[configured]});
  const version='rule_'+crypto.randomUUID();
  await admin.query("INSERT INTO e2.rule_versions(household_id,id,parameters,provenance) VALUES('h1',$1,'{\"delayHours\":72,\"quietWindowReps\":10,\"escalationDays\":14}','{}')",[version]);
  await admin.query("UPDATE e2.skill_guards SET last_exposure_at=now()-interval '60 hours' WHERE household_id='h1' AND learner_id=$1 AND skill_id=$2",[learner,configured]);
  refusals.push(await fails(a,sql,args(configured,'offer',null,request({ruleVersion:version})),'P0001'));
  const ready=skill+'_escalation_0';
  await admin.query("UPDATE e2.skill_guards SET last_exposure_at=now()-interval '49 hours' WHERE household_id='h1' AND learner_id=$1 AND skill_id=$2",[learner,ready]);
  refusals.push(await fails(a,sql,args(ready,'escalate'),'P0001'));
  const readyOffer=await call(a,args(ready,'offer'));
  refusals.push(await fails(a,sql,args(ready,'restart',readyOffer.id),'P0001'));
  // Force a failure after the transition insert, at close: all effects roll back.
  const failFn='fixture_close_fail_'+crypto.randomUUID().replaceAll('-','');
  await admin.query(`CREATE FUNCTION e2.${failFn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected close failure' USING ERRCODE='P0001'; END $$`);
  await admin.query(`CREATE TRIGGER ${failFn} BEFORE UPDATE ON e2.assessment_offers FOR EACH ROW EXECUTE FUNCTION e2.${failFn}()`);
  const takeArgs=args(ready,'take',readyOffer.id);
  try {refusals.push(await fails(a,sql,takeArgs,'P0001'));}
  finally {await admin.query(`DROP TRIGGER ${failFn} ON e2.assessment_offers`);await admin.query(`DROP FUNCTION e2.${failFn}()`);}
  assert.equal(await count(ready,'taken'),0);
  assert.equal(await scalar(a,'SELECT open AS value FROM e2.assessment_offers WHERE id=$1',[readyOffer.id]),true);
  // A long-running transaction can timestamp its take before the priority rep.
  // Inject that timestamp while retaining the real server-assigned causal order.
  const timeFn='fixture_take_time_'+crypto.randomUUID().replaceAll('-','');
  await admin.query(`CREATE FUNCTION e2.${timeFn}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='taken' THEN NEW.at:=transaction_timestamp()-interval '15 days'; END IF; RETURN NEW; END $$`);
  await admin.query(`CREATE TRIGGER ${timeFn} BEFORE INSERT ON e2.assessment_offers FOR EACH ROW EXECUTE FUNCTION e2.${timeFn}()`);
  let outOfTime;
  try {outOfTime=await call(a,takeArgs);}
  finally {await admin.query(`DROP TRIGGER ${timeFn} ON e2.assessment_offers`);await admin.query(`DROP FUNCTION e2.${timeFn}()`);}
  assert(new Date(outOfTime.at)<new Date(readyOffer.reason.priorityAt));
  assert(outOfTime.causal_seq>readyOffer.reason.prioritySeq);
  await exposure(t,{skills:[ready]});
  refusals.push(await fails(a,sql,args(ready,'escalate'),'P0001'));
  // Exercise partial unique indexes directly as owner, independent of the API.
  const uniqueSkill=skill+'_unique';await reps(uniqueSkill);const uniqueOffer=await call(a,args(uniqueSkill,'offer'));
  const duplicates=[];
  const cols='household_id,learner_id,skill_id,operation_id,kind,offer_id,exposure_seq,causal_seq,open,request,reason,provenance,at,rule_version';
  for(const id of [uniqueOffer.id,taken.id,(await scalar(a,"SELECT id AS value FROM e2.assessment_offers WHERE learner_id=$1 AND skill_id=$2 AND kind='restarted'",[learner,helped]))]) {
    duplicates.push(await fails(admin,`INSERT INTO e2.assessment_offers(${cols}) SELECT household_id,learner_id,skill_id,$2,kind,offer_id,exposure_seq,causal_seq,open,request,reason,provenance,at,rule_version FROM e2.assessment_offers WHERE id=$1`,[id,crypto.randomUUID()],'23505'));
  }
  emit('5','taken_since_priority_uses_sequence','assessment; owner timestamp fixture',{take:outOfTime,priorityAt:readyOffer.reason.priorityAt,prioritySeq:readyOffer.reason.prioritySeq});
  emit('5','partial_unique_indexes_and_atomic_close','owner/assessment',{duplicates,rollbackPreservedOffer:true});
  emit('5','roles_rls_missing_conflicts_and_immutable_columns','all capabilities; owner trigger controls',{refusals});
};
