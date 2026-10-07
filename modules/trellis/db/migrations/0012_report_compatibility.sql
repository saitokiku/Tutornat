-- Preserve the original report view's column contract so historical migration
-- --reapply remains possible. This replaces only a view, never evidence data.
CREATE OR REPLACE VIEW e2.qualification_projection WITH (security_invoker=true,security_barrier=true) AS
  SELECT household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes,certification,updated_at,
    qualification_state,qualification_reasons,qualification FROM e2.projections;
GRANT SELECT ON e2.qualification_projection TO learner,tutor,report,assessment;
DROP VIEW e2.report_projection;
CREATE VIEW e2.report_projection WITH (security_invoker=true,security_barrier=true) AS
  SELECT household_id,learner_id,skill_id,skill_version,rule_version,evidence_ids,independent_successes,certification,updated_at FROM e2.projections;
GRANT SELECT ON e2.report_projection TO learner,tutor,report,assessment;
