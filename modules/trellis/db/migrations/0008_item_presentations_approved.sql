-- 0007: e2.item_presentations shows approved, unrevoked items only (issue #10, item 2).
-- Forward-only. Same column list and view options as 0001; the predicate is the
-- item half of issue_attempt's approval check (0002/0004/0005): approval='approved'
-- and no content_revocations row for that item/version. The view runs with the
-- caller's rights, so learner/tutor/report need column SELECT on items.approval
-- (0001 granted them the presentation columns only); answer_key stays ungranted.
GRANT SELECT(approval) ON e2.items TO learner,tutor,report;
CREATE OR REPLACE VIEW e2.item_presentations WITH (security_invoker=true, security_barrier=true) AS
  SELECT i.household_id,i.id,i.version,i.skill_id,i.skill_version,i.family_id,i.context_tag,i.content
  FROM e2.items i
  WHERE i.approval='approved'
    AND NOT EXISTS(SELECT FROM e2.content_revocations v WHERE v.household_id=i.household_id
      AND v.target_kind='item' AND v.target_id=i.id AND v.target_version=i.version);
