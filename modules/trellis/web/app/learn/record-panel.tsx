import type { SkillRecord } from "@/lib/record";

function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Beside the chat: what is practised (assisted, counted as progress) vs proven (unassisted,
// delayed). Read from the seam through the report capability; never from the tutor.
export function RecordPanel({ r }: { r: SkillRecord }) {
  return (
    <section className="card" aria-label="Honest record">
      <h2>The record · {r.skillLabel}</h2>
      {r.source === "unconfigured" ? (
        <div className="notice warn" role="status">
          Demo mode: Trellis can reply, but practice and help are not saved yet.
        </div>
      ) : null}
      <div className="record">
        <div className="stat">
          <small>Practised with help</small>
          <b>{r.practised}</b>
          <small>{r.cleanReps} clean of {r.quietWindowReps} for a quiet window</small>
        </div>
        <div className="stat proven">
          <small>Proven alone</small>
          <b>{r.proven}</b>
          <small>{r.proven === 0 ? "none yet" : `certification: ${r.certification}`}</small>
        </div>
      </div>
      <p className="note">
        <span className={`pill ${r.proven > 0 ? "" : "practised"}`}>{r.proven > 0 ? "has proven work" : "practised only"}</span>
        {" "}Helped {r.helped} time{r.helped === 1 ? "" : "s"}.
      </p>
      <p className="note">
        {r.lastHelpAt
          ? r.eligibleNow
            ? `Quiet window open since ${when(r.eligibleAt)}. ${r.offerOpen ? "An independent check is offered." : "An independent check can be offered."}`
            : `Last help ${when(r.lastHelpAt)}. An independent check is possible from ${when(r.eligibleAt)} (${r.delayHours} h after help).`
          : "No help on this skill yet. An independent check could be offered."}
      </p>
      <p className="audit">rule {r.ruleVersion} · source {r.source === "seam" ? "e2 seam (report role)" : "no database configured"}</p>
    </section>
  );
}
