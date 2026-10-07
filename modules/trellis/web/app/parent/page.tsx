import { readRecord } from "@/lib/record";

export const dynamic = "force-dynamic";

// No silent trap (SPEC §3.1): if help keeps landing on a skill and no quiet window can be
// taken within 14 days, say so plainly. Round 1 condition: help recorded, not yet eligible,
// and the record shows repeated help; the 14-day escalation itself lives in the seam
// (offer_transition 'escalate') and is not yet driven from the UI.
export default async function ParentPage() {
  const r = await readRecord();
  const trapRisk = r.helped >= 3 && !r.eligibleNow;
  return (
    <main>
      <h1>Parent view</h1>
      <p className="sub">Household · Parent · one learner</p>
      {r.source === "unconfigured" ? (
        <div className="notice warn" role="status">
          Demo mode: practice and help are not saved until the database is connected.
        </div>
      ) : null}
      <section className="card">
        <h2>{r.learnerName}, 9</h2>
        <p style={{ margin: "0 0 8px" }}><b>{r.skillLabel}</b></p>
        <p style={{ margin: "0 0 8px" }}>
          <span className={`pill ${r.proven > 0 ? "" : "practised"}`}>{r.proven > 0 ? "proven" : "practised"}</span>
          {" "}{r.practised} practice turn{r.practised === 1 ? "" : "s"} with Trellis · {r.proven} proven alone · certification: {r.certification}
        </p>
        <p className="note">
          {r.lastHelpAt
            ? r.eligibleNow ? "The quiet window has passed; an independent check can be offered." : `Independent check possible from ${r.eligibleAt} (${r.delayHours} h after the last help).`
            : "No help recorded on this skill yet."}
        </p>
        <p className="audit">audit: rule {r.ruleVersion} · evidence class corrections-practice ({r.practised}) · assisted-help exposures ({r.helped}) · qualifying ({r.proven}) · read via report role</p>
      </section>
      {trapRisk ? (
        <div className="notice warn">
          We cannot certify this skill while we are helping with it nightly. Plan: keep helping on everything else, hold a quiet window on this skill, and offer the independent check the moment it is eligible. If that cannot happen within 14 days, we will say so here.
        </div>
      ) : (
        <div className="notice">
          Practice with help is progress, not proof. Proof needs an unassisted check at least {r.delayHours} hours after the last help, on more than one day. This page will say plainly if that cannot happen.
        </div>
      )}
    </main>
  );
}
