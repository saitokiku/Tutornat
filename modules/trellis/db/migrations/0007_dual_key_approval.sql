-- E3-K (issue #17): the dual-key content boundary. An item is approved only when
-- two keys authored by two distinct recorded logins agree exactly as rationals,
-- the stored grading key agrees with them, and the ADR-0067 content gate — the
-- same one-operation grammar as content-check.ts, in SQL — either agrees or
-- abstains. Its disagreement refuses; its abstention is recorded and does not.
-- Every approval decision, approved or refused, is an append-only audit row.
-- Forward-only; idempotent; applied through db/migrate.cjs.

-- The authoring/approval capability. Nothing else may author or approve a key.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'author') THEN CREATE ROLE author NOLOGIN; END IF;
END; $$;
ALTER ROLE author NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
DO $$ DECLARE membership record; BEGIN
  FOR membership IN SELECT parent.rolname AS parent_name, child.rolname AS child_name
    FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles child ON child.oid=m.member
    WHERE child.rolname = 'author' LOOP
    EXECUTE format('REVOKE %I FROM %I CASCADE',membership.parent_name,membership.child_name);
  END LOOP;
END; $$;
GRANT USAGE ON SCHEMA e2 TO author;
GRANT EXECUTE ON FUNCTION e2.household_id() TO author;
GRANT SELECT ON e2.item_presentations TO author;

CREATE TABLE IF NOT EXISTS e2.item_keys (
  household_id text NOT NULL,
  item_id text NOT NULL,
  item_version text NOT NULL,
  author_login name NOT NULL,
  key jsonb NOT NULL,
  provenance jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT e2.operation_clock(),
  PRIMARY KEY(household_id,item_id,item_version,author_login),
  FOREIGN KEY(household_id,item_id,item_version) REFERENCES e2.items
);
CREATE TABLE IF NOT EXISTS e2.item_approval_events (
  household_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_order bigint GENERATED ALWAYS AS IDENTITY,
  item_id text NOT NULL,
  item_version text NOT NULL,
  operation_id text NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('approved','refused')),
  reasons jsonb NOT NULL,
  authors text[] NOT NULL,
  agreed_key text,
  content_verdict jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT e2.operation_clock(),
  provenance jsonb NOT NULL,
  PRIMARY KEY(household_id,id),
  UNIQUE(household_id,item_id,item_version,operation_id),
  FOREIGN KEY(household_id,item_id,item_version) REFERENCES e2.items
);
CREATE UNIQUE INDEX IF NOT EXISTS item_approval_events_one_approval ON e2.item_approval_events(household_id,item_id,item_version) WHERE outcome='approved';
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['item_keys','item_approval_events'] LOOP
    EXECUTE format('ALTER TABLE e2.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE e2.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS household_isolation ON e2.%I', t);
    EXECUTE format('CREATE POLICY household_isolation ON e2.%I USING(household_id=e2.household_id()) WITH CHECK(household_id=e2.household_id())', t);
    EXECUTE format('REVOKE ALL ON e2.%I FROM PUBLIC,learner,tutor,report,assessment,author', t);
    EXECUTE format('GRANT SELECT,INSERT ON e2.%I TO e2_writer', t);
    EXECUTE format('DROP TRIGGER IF EXISTS append_only ON e2.%I', t);
    EXECUTE format('CREATE TRIGGER append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON e2.%I FOR EACH STATEMENT EXECUTE FUNCTION e2.reject_mutation()', t);
  END LOOP;
END; $$;
GRANT USAGE ON SEQUENCE e2.item_approval_events_event_order_seq TO e2_writer;
-- Report view: both authors and the decision, never the key. Invoker-security like the other
-- views, so application roles get column grants that exclude the agreed key and the gate's
-- expected value (`agreed_key`, `content_verdict`, `reasons` stay owner/e2_writer-only).
DROP VIEW IF EXISTS e2.item_approvals;
CREATE VIEW e2.item_approvals WITH (security_invoker=true, security_barrier=true) AS
  SELECT household_id,item_id,item_version,authors,provenance->>'login' AS approved_by,received_at AS approved_at
  FROM e2.item_approval_events WHERE outcome='approved';
GRANT SELECT(household_id,item_id,item_version,outcome,authors,received_at,provenance) ON e2.item_approval_events TO learner,tutor,report,assessment,author;
GRANT SELECT ON e2.item_approvals TO learner,tutor,report,assessment,author;

-- Exact rational parsing (content-check.ts `parseExactRational`): an integer, `p/q`
-- with positive integer q, or a finite decimal converted exactly; canonical `n` or
-- `n/d` text in lowest terms, else NULL. Arbitrary precision; no float anywhere.
CREATE OR REPLACE FUNCTION e2.exact_rational(p_text text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
DECLARE t text:=btrim(p_text); m text[]; n numeric; d numeric; a numeric; b numeric; g numeric; BEGIN
  m:=regexp_match(t,'^(-?\d+)/(\d+)$');
  IF m IS NOT NULL THEN
    n:=m[1]::numeric; d:=m[2]::numeric; IF d=0 THEN RETURN NULL; END IF;
  ELSE
    m:=regexp_match(t,'^(-?)(\d+)(?:\.(\d+))?$');
    IF m IS NULL THEN RETURN NULL; END IF;
    n:=(m[2]||coalesce(m[3],''))::numeric; IF m[1]='-' THEN n:=-n; END IF;
    d:=('1'||repeat('0',length(coalesce(m[3],''))))::numeric;
  END IF;
  a:=abs(n); b:=d; WHILE b<>0 LOOP g:=mod(a,b); a:=b; b:=g; END LOOP; g:=CASE WHEN a=0 THEN 1 ELSE a END;
  n:=div(n,g); d:=div(d,g);
  RETURN CASE WHEN d=1 THEN n::text ELSE n::text||'/'||d::text END;
END; $$;
REVOKE ALL ON FUNCTION e2.exact_rational(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.exact_rational(text) TO e2_writer,author,assessment;
-- A numeric answer key's exact rational, else NULL (`key_not_exact_rational`).
CREATE OR REPLACE FUNCTION e2.key_rational(p_key jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
  SELECT CASE WHEN p_key->>'type'='numeric' AND jsonb_typeof(p_key->'answer'->'value') IN ('string','number')
    THEN e2.exact_rational(p_key->'answer'->>'value') END;
$$;
REVOKE ALL ON FUNCTION e2.key_rational(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.key_rational(jsonb) TO e2_writer,author,assessment;

-- The content gate in SQL (ADR-0067, content-check.ts `evaluateStem`): after NFKC
-- (refused when it creates a digit), whitespace collapse, one whole-stem LaTeX
-- delimiter pair, one lead phrase, one trailer and one outer parenthesis pair, the
-- stem must be exactly `ATOM OP ATOM`. Returns {value,why,path}; value is the
-- canonical rational or NULL. There is no expression evaluator.
CREATE OR REPLACE FUNCTION e2.evaluate_stem(p_stem text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE t text; nf text; steps text[]:='{}'; m text[]; an numeric; ad numeric; bn numeric; bd numeric; rn numeric; rd numeric; a numeric; b numeric; g numeric; BEGIN
  IF p_stem IS NULL OR btrim(p_stem)='' THEN RETURN jsonb_build_object('value',NULL,'why','stem_missing','path','empty'); END IF;
  t:=p_stem;
  nf:=normalize(t,NFKC);
  IF length(regexp_replace(nf,'[^0-9]','','g'))<>length(regexp_replace(t,'[^0-9]','','g')) THEN
    RETURN jsonb_build_object('value',NULL,'why','not_canonical_stem','path',array_to_string('{none}'::text[]||steps||'{nfkc-lossy}'::text[],','));
  END IF;
  IF nf<>t THEN steps:=array_append(steps,'nfkc'); t:=nf; END IF;
  nf:=btrim(regexp_replace(t,'\s+',' ','g')); IF nf<>t THEN steps:=array_append(steps,'whitespace'); t:=nf; END IF;
  m:=regexp_match(t,'^(?:\$([^$]*)\$|\\\((.*)\\\))$');
  IF m IS NOT NULL THEN nf:=btrim(coalesce(m[1],m[2],'')); IF nf<>t THEN steps:=array_append(steps,'latex-delimiters'); t:=nf; END IF; END IF;
  nf:=regexp_replace(t,'^(?:please )?(?:compute|calculate|evaluate|simplify|work out|find the value of|what is the value of|what is) ?:? ?','','i'); IF nf<>t THEN steps:=array_append(steps,'lead-phrase'); t:=nf; END IF;
  nf:=regexp_replace(t,' ?(?:= ?\?)? ?[.?]?$',''); IF nf<>t THEN steps:=array_append(steps,'trail'); t:=nf; END IF;
  m:=regexp_match(t,'^\( ?([^()]*?) ?\)$');
  IF m IS NOT NULL THEN steps:=array_append(steps,'unwrap-parens'); t:=coalesce(m[1],''); END IF;
  m:=regexp_match(t,'^(\d+(?:/\d+)?) ?([+×*÷-]) ?(\d+(?:/\d+)?)$');
  IF m IS NULL THEN RETURN jsonb_build_object('value',NULL,'why','not_canonical_stem','path',array_to_string('{none}'::text[]||steps,',')); END IF;
  an:=split_part(m[1],'/',1)::numeric; ad:=coalesce(nullif(split_part(m[1],'/',2),''),'1')::numeric;
  bn:=split_part(m[3],'/',1)::numeric; bd:=coalesce(nullif(split_part(m[3],'/',2),''),'1')::numeric;
  IF ad=0 OR bd=0 THEN RETURN jsonb_build_object('value',NULL,'why','evaluator_error:division_by_zero','path',array_to_string('{error}'::text[]||steps,',')); END IF;
  CASE m[2]
    WHEN '+' THEN rn:=an*bd+bn*ad; rd:=ad*bd;
    WHEN '-' THEN rn:=an*bd-bn*ad; rd:=ad*bd;
    WHEN '×','*' THEN rn:=an*bn; rd:=ad*bd;
    WHEN '÷' THEN rn:=an*bd; rd:=ad*bn;
  END CASE;
  IF rd=0 THEN RETURN jsonb_build_object('value',NULL,'why','evaluator_error:division_by_zero','path',array_to_string('{error}'::text[]||steps,',')); END IF;
  a:=abs(rn); b:=rd; WHILE b<>0 LOOP g:=mod(a,b); a:=b; b:=g; END LOOP; g:=CASE WHEN a=0 THEN 1 ELSE a END;
  rn:=div(rn,g); rd:=div(rd,g);
  RETURN jsonb_build_object('value',CASE WHEN rd=1 THEN rn::text ELSE rn::text||'/'||rd::text END,'why',NULL,'path',array_to_string('{binary}'::text[]||steps,','));
END; $$;
REVOKE ALL ON FUNCTION e2.evaluate_stem(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.evaluate_stem(text) TO e2_writer,author,assessment;

-- Approved under the two-key rule: exactly one approved event for that item version.
CREATE OR REPLACE FUNCTION e2.item_approved(p_household text,p_item text,p_version text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT EXISTS(SELECT FROM e2.item_approval_events WHERE household_id=p_household AND item_id=p_item AND item_version=p_version AND outcome='approved');
$$;
ALTER FUNCTION e2.item_approved(text,text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.item_approved(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.item_approved(text,text,text) TO e2_writer;

-- One key per author per item version; the author is the session login, never a
-- parameter. Same key retried returns the stored row; a different key conflicts.
CREATE OR REPLACE FUNCTION e2.author_key(p_item text,p_item_version text,p_key jsonb,p_provenance jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); i e2.items; k e2.item_keys; BEGIN
  IF p_key IS NULL OR jsonb_typeof(p_key)<>'object' THEN RAISE EXCEPTION 'key must be a JSON object' USING ERRCODE='22023'; END IF;
  SELECT * INTO i FROM e2.items WHERE household_id=h AND id=p_item AND version=p_item_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'item unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  SELECT * INTO k FROM e2.item_keys WHERE household_id=h AND item_id=i.id AND item_version=i.version AND author_login=session_user;
  IF FOUND THEN
    IF k.key IS DISTINCT FROM p_key THEN RAISE EXCEPTION 'key conflict: this author already keyed this item version' USING ERRCODE='P0001'; END IF;
    RETURN to_jsonb(k);
  END IF;
  IF e2.item_approved(h,i.id,i.version) THEN RAISE EXCEPTION 'item version already approved' USING ERRCODE='P0001'; END IF;
  INSERT INTO e2.item_keys(household_id,item_id,item_version,author_login,key,provenance)
    VALUES(h,i.id,i.version,session_user,p_key,coalesce(p_provenance,'{}'::jsonb)||jsonb_build_object('login',session_user::text)) RETURNING * INTO k;
  RETURN to_jsonb(k);
END; $$;
ALTER FUNCTION e2.author_key(text,text,jsonb,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.author_key(text,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.author_key(text,text,jsonb,jsonb) TO author;

-- The approval decision. Never raises for a refusal: the refusal IS the audit row.
CREATE OR REPLACE FUNCTION e2.approve_item(p_item text,p_item_version text,p_operation text,p_provenance jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); i e2.items; ev e2.item_approval_events; reasons jsonb:='[]'; authors text[]; agreed text; distinct_values int; rational_authors int; stored text; gate jsonb; verdict jsonb; k record; BEGIN
  IF p_operation IS NULL OR p_operation='' THEN RAISE EXCEPTION 'operation required' USING ERRCODE='22023'; END IF;
  SELECT * INTO i FROM e2.items WHERE household_id=h AND id=p_item AND version=p_item_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'item unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  SELECT * INTO ev FROM e2.item_approval_events WHERE household_id=h AND item_id=i.id AND item_version=i.version AND operation_id=p_operation;
  IF FOUND THEN RETURN to_jsonb(ev); END IF;
  SELECT * INTO ev FROM e2.item_approval_events WHERE household_id=h AND item_id=i.id AND item_version=i.version AND outcome='approved';
  IF FOUND THEN RETURN to_jsonb(ev); END IF;
  authors:='{}'::text[];
  FOR k IN SELECT author_login,e2.key_rational(key) AS rational FROM e2.item_keys WHERE household_id=h AND item_id=i.id AND item_version=i.version ORDER BY author_login COLLATE "C" LOOP
    authors:=array_append(authors,k.author_login::text);
    IF k.rational IS NULL THEN reasons:=reasons||to_jsonb('key_not_exact_rational:'||k.author_login::text); END IF;
  END LOOP;
  SELECT count(DISTINCT e2.key_rational(key)),min(e2.key_rational(key)),count(DISTINCT author_login) INTO distinct_values,agreed,rational_authors FROM e2.item_keys WHERE household_id=h AND item_id=i.id AND item_version=i.version AND e2.key_rational(key) IS NOT NULL;
  IF rational_authors<2 THEN reasons:=reasons||'"fewer_than_two_authors"'::jsonb; END IF;
  IF distinct_values>1 THEN reasons:=reasons||'"keys_disagree"'::jsonb; agreed:=NULL; END IF;
  stored:=e2.key_rational(i.answer_key);
  IF agreed IS NOT NULL AND stored IS DISTINCT FROM agreed THEN reasons:=reasons||'"stored_key_disagrees"'::jsonb; END IF;
  gate:=e2.evaluate_stem(i.content->>'stem');
  IF gate->>'value' IS NULL THEN verdict:=jsonb_build_object('status','abstained','reason',gate->>'why','path',gate->>'path');
  ELSIF agreed IS NULL THEN verdict:=jsonb_build_object('status','no_agreed_key','expected',gate->>'value','path',gate->>'path');
  ELSIF gate->>'value'=agreed THEN verdict:=jsonb_build_object('status','agrees','expected',gate->>'value','path',gate->>'path');
  ELSE verdict:=jsonb_build_object('status','disagrees','expected',gate->>'value','keyed',agreed,'path',gate->>'path'); reasons:=reasons||'"content_gate_disagrees"'::jsonb; END IF;
  INSERT INTO e2.item_approval_events(household_id,item_id,item_version,operation_id,outcome,reasons,authors,agreed_key,content_verdict,provenance)
    VALUES(h,i.id,i.version,p_operation,CASE WHEN jsonb_array_length(reasons)=0 THEN 'approved' ELSE 'refused' END,reasons,authors,CASE WHEN jsonb_array_length(reasons)=0 THEN agreed END,verdict,coalesce(p_provenance,'{}'::jsonb)||jsonb_build_object('login',session_user::text,'function','approve_item'))
    RETURNING * INTO ev;
  RETURN to_jsonb(ev);
END; $$;
ALTER FUNCTION e2.approve_item(text,text,text,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.approve_item(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.approve_item(text,text,text,jsonb) TO author;

-- issue_attempt: the 0002 body plus the two-key rule.
CREATE OR REPLACE FUNCTION e2.issue_attempt(p_learner text,p_item text,p_item_version text,p_operation text,p_session text,p_scorer text,p_scorer_version text,p_rule text DEFAULT 'e2-draft-1') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); i e2.items; a e2.attempts; g e2.skill_guards; BEGIN
  SELECT * INTO i FROM e2.items WHERE household_id=h AND id=p_item AND version=p_item_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'item unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[i.skill_id],i.skill_version);
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  PERFORM e2.lock_content(h,'rubric',i.rubric_id,i.rubric_version);
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND operation_id=p_operation;
  IF FOUND THEN
    IF a.item_id IS DISTINCT FROM p_item OR a.item_version IS DISTINCT FROM p_item_version OR a.session_id IS DISTINCT FROM p_session OR a.scorer_id IS DISTINCT FROM p_scorer OR a.scorer_version IS DISTINCT FROM p_scorer_version OR a.rule_version IS DISTINCT FROM p_rule THEN
      RAISE EXCEPTION 'issue operation conflict' USING ERRCODE='P0001';
    END IF;
    RETURN to_jsonb(a);
  END IF;
  IF i.approval<>'approved' OR NOT EXISTS(SELECT FROM e2.rubrics WHERE household_id=h AND id=i.rubric_id AND version=i.rubric_version AND approval='approved') OR EXISTS(SELECT FROM e2.content_revocations WHERE household_id=h AND ((target_kind='item' AND target_id=i.id AND target_version=i.version) OR (target_kind='rubric' AND target_id=i.rubric_id AND target_version=i.rubric_version))) THEN
    RAISE EXCEPTION 'content is not approved' USING ERRCODE='P0001';
  END IF;
  IF NOT e2.item_approved(h,i.id,i.version) THEN
    RAISE EXCEPTION 'content is not approved under the two-key rule' USING ERRCODE='P0001';
  END IF;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=i.skill_id RETURNING * INTO g;
  INSERT INTO e2.attempts(household_id,operation_id,learner_id,item_id,item_version,key_version,rubric_id,rubric_version,skill_id,skill_version,family_id,context_tag,scorer_id,scorer_version,rule_version,session_id,issued_seq,exposure_seq)
    VALUES(h,p_operation,p_learner,i.id,i.version,i.key_version,i.rubric_id,i.rubric_version,i.skill_id,i.skill_version,i.family_id,i.context_tag,p_scorer,p_scorer_version,p_rule,p_session,g.causal_seq,g.exposure_seq) RETURNING * INTO a;
  RETURN to_jsonb(a);
END; $$;
ALTER FUNCTION e2.issue_attempt(text,text,text,text,text,text,text,text) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.issue_attempt(text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.issue_attempt(text,text,text,text,text,text,text,text) TO assessment;

-- finalize_attempt: the 0005 body plus the two-key rule inside `content_not_approved`.
CREATE OR REPLACE FUNCTION e2.finalize_attempt(p_learner text,p_attempt uuid,p_response jsonb,p_score jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; i e2.items; g e2.skill_guards; e e2.evidence_events; reasons jsonb:='[]'; result jsonb; eligible boolean; stamp timestamptz; BEGIN
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt unavailable' USING ERRCODE='P0002'; END IF;
  PERFORM e2.lock_skills(p_learner,ARRAY[a.skill_id],a.skill_version);
  SELECT * INTO a FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND id=p_attempt FOR UPDATE;
  IF a.response IS DISTINCT FROM p_response OR p_response IS NULL THEN RAISE EXCEPTION 'response conflict' USING ERRCODE='P0001'; END IF;
  IF a.state='finalized' THEN RETURN a.final_result; END IF;
  IF a.state<>'submitted' THEN RAISE EXCEPTION 'attempt is not submitted' USING ERRCODE='P0001'; END IF;
  SELECT * INTO i FROM e2.items WHERE household_id=h AND id=a.item_id AND version=a.item_version;
  PERFORM e2.lock_projection_content(p_learner,ARRAY[a.skill_id]);
  PERFORM e2.lock_content(h,'item',i.id,i.version);
  PERFORM e2.lock_content(h,'rubric',i.rubric_id,i.rubric_version);
  SELECT * INTO g FROM e2.skill_guards WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id;
  stamp:=e2.operation_clock();
  IF a.assistance_latched OR g.exposure_seq<>a.exposure_seq THEN reasons:=reasons||'"assistance_observed"'::jsonb; END IF;
  IF g.last_exposure_at IS NOT NULL AND a.issued_at-g.last_exposure_at<(SELECT (parameters->>'delayHours')::double precision*interval '1 hour' FROM e2.rule_versions WHERE household_id=h AND id=a.rule_version) THEN reasons:=reasons||'"delay_under_48h"'::jsonb; END IF;
  IF i.approval<>'approved' OR NOT e2.item_approved(h,i.id,i.version) OR NOT EXISTS(SELECT FROM e2.rubrics WHERE household_id=h AND id=a.rubric_id AND version=a.rubric_version AND approval='approved') OR EXISTS(SELECT FROM e2.content_revocations WHERE household_id=h AND ((target_kind='item' AND target_id=i.id AND target_version=i.version) OR (target_kind='rubric' AND target_id=i.rubric_id AND target_version=i.rubric_version))) THEN reasons:=reasons||'"content_not_approved"'::jsonb; END IF;
  IF EXISTS(SELECT FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND item_id=a.item_id AND id<>a.id AND issue_order<a.issue_order) THEN reasons:=reasons||'"familiar_item"'::jsonb; END IF;
  IF p_score IS NULL OR jsonb_typeof(p_score->'correct') IS DISTINCT FROM 'boolean' OR p_score->'correct'<>'true'::jsonb THEN reasons:=reasons||'"not_correct_or_ungraded"'::jsonb; END IF;
  eligible:=jsonb_array_length(reasons)=0;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id RETURNING * INTO g;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,received_at,payload,provenance,rule_version)
    VALUES(h,p_learner,'attempt:'||a.id,a.id,a.session_id,a.skill_id,a.skill_version,g.causal_seq,'unassisted-attempt',eligible,stamp,
      jsonb_build_object('score',p_score,'reasons',reasons,'response',a.response),
      jsonb_build_object('itemId',a.item_id,'itemVersion',a.item_version,'keyVersion',a.key_version,'rubricId',a.rubric_id,'rubricVersion',a.rubric_version,'familyId',a.family_id,'contextTag',a.context_tag,'scorerId',a.scorer_id,'scorerVersion',a.scorer_version,'issuedSeq',a.issued_seq,'exposureSeq',g.exposure_seq),a.rule_version) RETURNING * INTO e;
  result:=jsonb_build_object('attemptId',a.id,'evidenceId',e.id,'qualifying',eligible,'reasons',reasons,'certification','none','ruleVersion',a.rule_version);
  UPDATE e2.attempts SET state='finalized',finalized_at=stamp,final_result=result WHERE household_id=h AND id=a.id;
  PERFORM e2.rebuild_projection(p_learner,a.skill_id);
  RETURN result;
END; $$;
ALTER FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) TO assessment;
