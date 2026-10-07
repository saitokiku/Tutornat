-- 0014: E3 integration (#24) round 2 — the seams between #16, #17, #18 and #19.
-- Forward-only; never edits an applied migration.
--
-- 1. finalize_attempt: 0010 and 0011 replaced #17's (0007) body without its
--    `NOT e2.item_approved(...)` predicate, so an attempt issued before the
--    upgrade finalized as qualifying with zero authored keys. The two-key
--    approval authority is a finalization reason again (`content_not_approved`).
-- 2. item_presentations: 0008 filtered on items.approval only; an item with
--    approval='approved' but a refused approve_item decision stayed visible to
--    learner/tutor/report. The view now also requires an approved decision.
-- 3. exact_rational / evaluate_stem: one grammar in two languages. `btrim` is
--    not JavaScript `trim()`; e2.js_trim strips exactly the JS `\s`/`trim()`
--    class (content-check.ts). The trailer is the closed list `= ?` | `.` | `?`;
--    `= ?.` and `= ??` abstain (issue #15, #19). Vectors shared with the
--    TypeScript test: tests/engine/content-vectors.json.

-- 1. Two-key approval is a finalization reason (0007), on top of 0011's receipt-time body.
CREATE OR REPLACE FUNCTION e2.finalize_attempt(p_learner text,p_attempt uuid,p_response jsonb,p_score jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h text:=e2.household_id(); a e2.attempts; i e2.items; g e2.skill_guards; e e2.evidence_events; reasons jsonb:='[]'; result jsonb; eligible boolean; stamp timestamptz; receipt timestamptz; anchor e2.evidence_events; zone text; offset_day integer; in_window boolean:=false; protocol jsonb; projection jsonb; window_start integer; window_end integer; BEGIN
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
  receipt:=a.submitted_at;
  IF a.assistance_latched OR g.exposure_seq<>a.exposure_seq THEN reasons:=reasons||'"assistance_observed"'::jsonb; END IF;
  IF g.last_exposure_at IS NOT NULL AND a.issued_at-g.last_exposure_at<(SELECT (parameters->>'delayHours')::double precision*interval '1 hour' FROM e2.rule_versions WHERE household_id=h AND id=a.rule_version) THEN reasons:=reasons||'"delay_under_48h"'::jsonb; END IF;
  IF i.approval<>'approved' OR NOT e2.item_approved(h,i.id,i.version) OR NOT EXISTS(SELECT FROM e2.rubrics WHERE household_id=h AND id=a.rubric_id AND version=a.rubric_version AND approval='approved') OR EXISTS(SELECT FROM e2.content_revocations WHERE household_id=h AND ((target_kind='item' AND target_id=i.id AND target_version=i.version) OR (target_kind='rubric' AND target_id=i.rubric_id AND target_version=i.rubric_version))) THEN reasons:=reasons||'"content_not_approved"'::jsonb; END IF;
  IF EXISTS(SELECT FROM e2.attempts WHERE household_id=h AND learner_id=p_learner AND item_id=a.item_id AND id<>a.id AND issue_order<a.issue_order) THEN reasons:=reasons||'"familiar_item"'::jsonb; END IF;
  IF p_score IS NULL OR jsonb_typeof(p_score->'correct') IS DISTINCT FROM 'boolean' OR p_score->'correct'<>'true'::jsonb THEN reasons:=reasons||'"not_correct_or_ungraded"'::jsonb; END IF;
  SELECT * INTO anchor FROM e2.evidence_events WHERE household_id=h AND learner_id=p_learner
    AND skill_id=a.skill_id AND skill_version=a.skill_version AND rule_version=a.rule_version AND qualifying AND payload ? 'e13'
    ORDER BY causal_seq,id LIMIT 1;
  SELECT timezone INTO zone FROM e2.households WHERE household_id=h;
  -- Freeze the household zone of the first success for this rule/skill cohort.
  -- An audited household change applies to subsequent cohorts, not old evidence.
  zone:=COALESCE(anchor.payload->'e13'->>'timezone',zone);
  SELECT COALESCE((parameters->'daySeven'->>0)::integer,6),COALESCE((parameters->'daySeven'->>1)::integer,9)
    INTO window_start,window_end FROM e2.rule_versions WHERE household_id=h AND id=a.rule_version;
  offset_day:=CASE WHEN anchor.id IS NULL THEN 0 ELSE (receipt AT TIME ZONE zone)::date-(anchor.received_at AT TIME ZONE zone)::date END;
  in_window:=anchor.id IS NOT NULL AND offset_day BETWEEN window_start AND window_end;
  protocol:=jsonb_build_object('timezone',zone,'localDate',(receipt AT TIME ZONE zone)::date,
    'localDayOffset',offset_day,'retentionInWindow',in_window,'ruleVersion',a.rule_version);
  eligible:=jsonb_array_length(reasons)=0;
  UPDATE e2.skill_guards SET causal_seq=causal_seq+1 WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id RETURNING * INTO g;
  INSERT INTO e2.evidence_events(household_id,learner_id,operation_id,attempt_id,session_id,skill_id,skill_version,causal_seq,class,qualifying,received_at,payload,provenance,rule_version)
    VALUES(h,p_learner,'attempt:'||a.id,a.id,a.session_id,a.skill_id,a.skill_version,g.causal_seq,CASE WHEN eligible AND in_window THEN 'delayed-retention' ELSE 'unassisted-attempt' END,eligible,receipt,
      jsonb_build_object('score',p_score,'reasons',reasons,'response',a.response,'e13',protocol),
      jsonb_build_object('itemId',a.item_id,'itemVersion',a.item_version,'keyVersion',a.key_version,'rubricId',a.rubric_id,'rubricVersion',a.rubric_version,'familyId',a.family_id,'contextTag',a.context_tag,'scorerId',a.scorer_id,'scorerVersion',a.scorer_version,'issuedSeq',a.issued_seq,'exposureSeq',g.exposure_seq),a.rule_version) RETURNING * INTO e;
  PERFORM e2.rebuild_projection(p_learner,a.skill_id);
  SELECT qualification INTO projection FROM e2.projections WHERE household_id=h AND learner_id=p_learner AND skill_id=a.skill_id AND skill_version=a.skill_version AND rule_version=a.rule_version;
  result:=jsonb_build_object('attemptId',a.id,'evidenceId',e.id,'qualifying',eligible,'reasons',reasons,'certification','none','ruleVersion',a.rule_version,'qualificationState',projection->>'state','qualificationReasons',projection->'reasons','qualification',projection);
  UPDATE e2.attempts SET state='finalized',finalized_at=stamp,final_result=result WHERE household_id=h AND id=a.id;
  RETURN result;
END; $$;
ALTER FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) OWNER TO e2_writer;
REVOKE ALL ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.finalize_attempt(text,uuid,jsonb,jsonb) TO assessment;


-- 2. The presentation view honours the two-key approval authority (0007) as well as revocation (0008).
-- Invoker-security: learner/tutor/report already hold column SELECT on
-- item_approval_events(item_id,item_version,outcome,...) from 0007 and RLS scopes it to the household.
CREATE OR REPLACE VIEW e2.item_presentations WITH (security_invoker=true, security_barrier=true) AS
  SELECT i.household_id,i.id,i.version,i.skill_id,i.skill_version,i.family_id,i.context_tag,i.content
  FROM e2.items i
  WHERE i.approval='approved'
    AND EXISTS(SELECT FROM e2.item_approval_events p WHERE p.household_id=i.household_id
      AND p.item_id=i.id AND p.item_version=i.version AND p.outcome='approved')
    AND NOT EXISTS(SELECT FROM e2.content_revocations v WHERE v.household_id=i.household_id
      AND v.target_kind='item' AND v.target_id=i.id AND v.target_version=i.version);

-- 3. JavaScript `String.prototype.trim()` / `\s` whitespace (ECMA-262 WhiteSpace + LineTerminator):
-- TAB LF VT FF CR SP NBSP U+1680 U+2000–U+200A LS PS U+202F U+205F U+3000 BOM.
CREATE OR REPLACE FUNCTION e2.js_trim(p_text text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
  SELECT regexp_replace(regexp_replace(p_text,'^[\t\n\u000b\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+',''),'[\t\n\u000b\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$','');
$$;
REVOKE ALL ON FUNCTION e2.js_trim(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION e2.js_trim(text) TO e2_writer,author,assessment;

CREATE OR REPLACE FUNCTION e2.exact_rational(p_text text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
DECLARE t text:=e2.js_trim(p_text); m text[]; n numeric; d numeric; a numeric; b numeric; g numeric; BEGIN
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

CREATE OR REPLACE FUNCTION e2.evaluate_stem(p_stem text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE t text; nf text; steps text[]:='{}'; m text[]; an numeric; ad numeric; bn numeric; bd numeric; rn numeric; rd numeric; a numeric; b numeric; g numeric; BEGIN
  IF p_stem IS NULL OR e2.js_trim(p_stem)='' THEN RETURN jsonb_build_object('value',NULL,'why','stem_missing','path','empty'); END IF;
  t:=p_stem;
  nf:=normalize(t,NFKC);
  IF length(regexp_replace(nf,'[^0-9]','','g'))<>length(regexp_replace(t,'[^0-9]','','g')) THEN
    RETURN jsonb_build_object('value',NULL,'why','not_canonical_stem','path',array_to_string('{none}'::text[]||steps||'{nfkc-lossy}'::text[],','));
  END IF;
  IF nf<>t THEN steps:=array_append(steps,'nfkc'); t:=nf; END IF;
  nf:=e2.js_trim(regexp_replace(t,'[\t\n\u000b\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+',' ','g')); IF nf<>t THEN steps:=array_append(steps,'whitespace'); t:=nf; END IF;
  m:=regexp_match(t,'^(?:\$([^$]*)\$|\\\((.*)\\\))$');
  IF m IS NOT NULL THEN nf:=e2.js_trim(coalesce(m[1],m[2],'')); IF nf<>t THEN steps:=array_append(steps,'latex-delimiters'); t:=nf; END IF; END IF;
  nf:=regexp_replace(t,'^(?:please )?(?:compute|calculate|evaluate|simplify|work out|find the value of|what is the value of|what is) ?:? ?','','i'); IF nf<>t THEN steps:=array_append(steps,'lead-phrase'); t:=nf; END IF;
  -- Closed trailer list: `= ?`, `.`, or `?` — one of them, once (content-check.ts TRAIL).
  nf:=regexp_replace(t,' ?(?:= ?\?|[.?])$',''); IF nf<>t THEN steps:=array_append(steps,'trail'); t:=nf; END IF;
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
