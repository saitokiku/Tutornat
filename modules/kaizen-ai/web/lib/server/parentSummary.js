// Monthly parent summary — the "you don't have to guess whether anything is
// happening" email (shop plan §14). Runs from the HOURLY cron but self-gates
// to the first 48 hours of each calendar month, summarizing the month that
// just ended for every parent with an active link or managed teen.
//
// DESIGN CHOICES, DELIBERATE:
//   - Stats come from lib/server/familySummary.js — computed server-side from
//     the database. Never from a client snapshot, never from an LLM: a
//     parent-facing report must not be hallucinatable.
//   - Idempotency rides usage_ledger (feature='parent_summary', one row per
//     parent/child/month in metadata) — no new table, and the cron can fire
//     hourly all day without double-sending.
//   - kind:'promo', so a parent who opted out of non-essential mail is
//     respected automatically by sendEmail's suppression.

import { sendEmail, esc } from '@/lib/server/email';
import { summarizeStudent, sessionsInWindow } from '@/lib/server/familySummary';

const BATCH_LIMIT = 200;       // parents per tick; the cron re-fires hourly
const WINDOW_HOURS = 48;

function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function sendMonthlySummaries(svc, { now = new Date() } = {}) {
  // Only inside the first 48h of a month.
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  if (now.getTime() - monthStart.getTime() > WINDOW_HOURS * 3600 * 1000) {
    return { sent: 0, skipped: 'outside_window' };
  }

  // The month being reported on: the one that just ended.
  const reportStart = new Date(monthStart);
  reportStart.setMonth(reportStart.getMonth() - 1);
  const monthKey = monthKeyOf(reportStart);
  const monthName = reportStart.toLocaleString('en-US', { month: 'long' });

  // Every active parent↔student pair (invited or managed — both are 'active').
  const { data: links } = await svc.from('parent_student_relationships')
    .select('parent_id,student_id')
    .eq('status', 'active')
    .limit(2000);
  if (!links?.length) return { sent: 0 };

  const parentIds = [...new Set(links.map((l) => l.parent_id))].slice(0, BATCH_LIMIT);

  // Idempotency: what has already been sent for this month?
  const { data: sentRows } = await svc.from('usage_ledger')
    .select('user_id,metadata')
    .eq('feature', 'parent_summary')
    .in('user_id', parentIds)
    .gte('created_at', monthStart.toISOString());
  const already = new Set(
    (sentRows || [])
      .filter((r) => r.metadata?.month === monthKey)
      .map((r) => `${r.user_id}:${r.metadata?.childId}`),
  );

  const { data: parents } = await svc.from('profiles')
    .select('id,email,name').in('id', parentIds);
  const parentById = Object.fromEntries((parents || []).map((p) => [p.id, p]));

  let sent = 0;
  for (const link of links) {
    if (!parentIds.includes(link.parent_id)) continue;
    if (already.has(`${link.parent_id}:${link.student_id}`)) continue;
    const parent = parentById[link.parent_id];
    if (!parent?.email) continue;

    try {
      const [summary, sessions] = await Promise.all([
        summarizeStudent(svc, link.student_id),
        sessionsInWindow(svc, link.student_id, { from: reportStart, to: monthStart }),
      ]);

      const attended = sessions.hall + sessions.clinics + sessions.community + sessions.privateSessions;
      // Nothing happened and nothing is tracked → no email. An empty report
      // teaches parents to ignore the real ones.
      if (attended === 0 && summary.courses.length === 0 && !summary.latestReport) {
        already.add(`${link.parent_id}:${link.student_id}`);
        await recordSent(svc, link, monthKey, { empty: true });
        continue;
      }

      const courseLines = summary.courses.map((c) =>
        `<tr><td style="padding:3px 10px 3px 0;color:#756E67">${esc(c.name)}</td>
             <td style="padding:3px 0;font-weight:600">${esc(c.letter || '—')}${c.percent != null ? ` · ${Math.round(c.percent)}%` : ''}</td></tr>`
      ).join('');
      const sessionBits = [
        sessions.hall ? `${sessions.hall} Homework Hall ${sessions.hall === 1 ? 'visit' : 'visits'}` : null,
        sessions.clinics ? `${sessions.clinics} Subject ${sessions.clinics === 1 ? 'Clinic' : 'Clinics'}` : null,
        sessions.community ? `${sessions.community} free community ${sessions.community === 1 ? 'session' : 'sessions'}` : null,
        sessions.privateSessions ? `${sessions.privateSessions} private ${sessions.privateSessions === 1 ? 'session' : 'sessions'}` : null,
      ].filter(Boolean).join(' · ');
      // Email styles are inlined (no Tailwind in email clients). The hex values
      // ARE the live tokens from tailwind.config.js: #F4F1EB = panel2/linen,
      // #211D1A = ink, #756E67 = muted, #B4536F = accent.
      const reportBlock = summary.latestReport
        ? `<div style="background:#F4F1EB;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.6;color:#211D1A;white-space:pre-wrap">${esc(summary.latestReport.content).slice(0, 1500)}</div>`
        : '';

      await sendEmail({
        to: parent.email,
        kind: 'promo',
        subject: `${summary.student.name} — ${monthName} at Kaizen`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#211D1A">
            <h2 style="font-size:19px">${esc(summary.student.name)} — ${esc(monthName)}</h2>
            <p style="font-size:14px;line-height:1.6;color:#756E67">
              ${attended > 0
                ? `Sessions attended: <b>${attended}</b>${sessionBits ? ` (${sessionBits})` : ''}.`
                : 'No live sessions this month.'}
              ${summary.streak ? ` Study streak: <b>${summary.streak} days</b>.` : ''}
              ${summary.openAssignments ? ` Open assignments right now: <b>${summary.openAssignments}</b>.` : ''}
            </p>
            ${courseLines ? `<table style="font-size:13px;border-collapse:collapse">${courseLines}</table>` : ''}
            ${reportBlock}
            <p style="font-size:13px;line-height:1.6;color:#756E67;margin-top:14px">
              Book next month's sessions, or check progress any time, from your
              <a href="${(process.env.APP_URL || '').replace(/\/$/, '')}/family" style="color:#B4536F">family page</a>.
            </p>
            <p style="font-size:12px;color:#756E67">— The Kaizen team</p>
          </div>`,
      });
      await recordSent(svc, link, monthKey, {});
      sent += 1;
    } catch (e) {
      console.error('[parentSummary] failed', link.parent_id, link.student_id, e?.message);
    }
  }
  return { sent, month: monthKey };
}

async function recordSent(svc, link, monthKey, extra) {
  await svc.from('usage_ledger').insert({
    user_id: link.parent_id,
    feature: 'parent_summary',
    quantity: 1,
    est_cost_usd: 0,
    metadata: { month: monthKey, childId: link.student_id, ...extra },
  });
}
