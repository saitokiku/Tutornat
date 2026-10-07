// Inbound-text safety screening. SERVER ONLY.
//
// WHY THIS EXISTS
// Kaizen serves minors and had NO automated detection on anything a student or
// tutor types. STUDENT_SAFETY makes the tutor RESPOND well in-conversation (988,
// Crisis Text Line, abuse resources), but nobody on the safety team ever learns
// a disclosure happened. Detection and response are different jobs: the model
// answers the child; this routes the event to a human who can follow up.
//
// v0 IS DETERMINISTIC ON PURPOSE.
// It is a pattern pre-filter, not a model. That buys three things a model call
// cannot: zero added latency on every tutoring message, zero per-message cost,
// and no dependency on a provider being up. The highest-severity disclosures use
// explicit language ("I want to kill myself", "he touches me", "meet me after"),
// which patterns catch well. A model classifier is the planned v1 and slots in
// behind the same screenText() interface — callers do not change.
//
// PRECISION POSTURE. This feeds a HUMAN review queue; it never blocks a message
// or accuses anyone. For self-harm and abuse we favour recall (better a human
// glances at a false alarm than misses a real one). For everything else we favour
// precision so the queue stays reviewable. severity drives how loudly we alert.

// Each rule: a category, a severity, and patterns that must be specific enough
// that a plausible innocent sentence does not trip them. Word boundaries and
// multi-word phrases do most of that work.
const RULES = [
  {
    category: 'self_harm',
    severity: 'critical',
    // Favour recall — these are the ones we must not miss. The one genuinely
    // ambiguous phrase is "want to die", which is also teen hyperbole ("die of
    // embarrassment", "die of boredom"); it is matched only when NOT followed by
    // a hyperbole continuation, so a real bare disclosure still trips while the
    // idiom does not flood the human queue.
    patterns: [
      /\b(kill|hurt|harm|cut|cutting)\s+(myself|my ?self)\b/i,
      // "to" is optional so the contracted forms ("wanna end it all", "gonna kill
      // myself") match as well as the full "want to end it all".
      /\bi\s+(want|wanna|need|going|gonna|plan|have|had)\s+(to\s+)?(end\s+(it all|it|my life)|kill myself)\b/i,
      /\bi\s+(want|wanna|need|gonna)\s+(to\s+)?die\b(?!\s+(of|from|for|laughing|inside))/i,
      /\b(end|take)\s+my\s+(own\s+)?life\b/i,
      /\bi\s+(don'?t|do not)\s+want\s+to\s+(be alive|live|exist)\b/i,
      /\bsuicid(e|al)\b/i,
      /\bself[-\s]?harm/i,
      /\bno\s+reason\s+to\s+(live|go on)\b/i,
    ],
  },
  {
    category: 'abuse',
    severity: 'critical',
    patterns: [
      /\b(he|she|they|dad|mom|mum|uncle|aunt|step\w*|coach|teacher)\s+(hit|hits|beat|beats|touch(es|ed)?|hurt(s|ed)?)\s+me\b/i,
      /\bhurts?\s+me\s+at\s+home\b/i,
      /\b(being|been|getting)\s+(abused|molested|beaten)\b/i,
      /\bafraid\s+to\s+go\s+home\b/i,
      /\b(touched|touches)\s+me\s+(there|inappropriately|where)\b/i,
    ],
  },
  {
    category: 'grooming_offplatform',
    severity: 'high',
    // A tutor or peer trying to move a minor off-platform or collect contact
    // details — the strongest early signal of grooming we can catch cheaply.
    patterns: [
      /\b(text|call|message|dm|add|find)\s+me\s+(on|at|@)\s*(snap(chat)?|insta(gram)?|whats ?app|telegram|discord|tiktok|my\s+(phone|number|cell))\b/i,
      /\bwhat'?s\s+your\s+(phone\s+)?(number|snap|insta|address)\b/i,
      /\b(meet|see)\s+(me|you|up)\s+(in person|after (school|class|the session|this)|irl|at my|at your)\b/i,
      /\b(don'?t|do not)\s+tell\s+(your|anyone|the)\s+(parents?|mom|dad|teacher|kaizen)\b/i,
      /\bkeep\s+(this|it)\s+(a\s+)?secret\b/i,
      /\bsend\s+(me\s+)?(a\s+)?(pic|picture|photo|selfie)\b/i,
    ],
  },
  {
    category: 'sexual',
    severity: 'high',
    patterns: [
      /\b(sext|nudes?|naked pic|send nudes)\b/i,
      /\bare\s+you\s+(single|a virgin)\b/i,
    ],
  },
  {
    category: 'violence_weapons',
    severity: 'high',
    patterns: [
      /\b(kill|shoot|stab|hurt)\s+(him|her|them|everyone|people|the (class|school|teacher))\b/i,
      /\b(bring|make|build)\s+a\s+(gun|bomb|weapon)\b/i,
      /\bshoot\s+up\s+(the|my)\s+school\b/i,
    ],
  },
];

const SEVERITY_RANK = { critical: 3, high: 2, medium: 1 };

/**
 * Screen a single piece of inbound text. PURE — no I/O, so the rule set is fully
 * testable. Returns the matched categories and the highest severity among them.
 *
 * @param {string} text
 * @returns {{ flagged: boolean, categories: string[], severity: string|null }}
 */
export function screenText(text) {
  const s = String(text || '');
  if (!s.trim()) return { flagged: false, categories: [], severity: null };
  const hits = [];
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(s))) hits.push(rule);
  }
  if (!hits.length) return { flagged: false, categories: [], severity: null };
  const severity = hits.reduce((top, r) =>
    SEVERITY_RANK[r.severity] > SEVERITY_RANK[top] ? r.severity : top, 'medium');
  return { flagged: true, categories: [...new Set(hits.map((r) => r.category))], severity };
}

/**
 * Screen text and, if flagged, record a safety_event and alert admins.
 * NON-BLOCKING by contract: callers fire-and-forget so tutoring latency is never
 * affected. Never throws — a screening failure must not break the request it
 * rode in on. Returns the screen result for callers that want it.
 *
 * Stores a snippet truncated to 280 characters — never the full message or
 * transcript — plus the account id: enough for a human to triage and open the
 * account. The snippet is the student's own words, untouched, so the safety
 * queue is itself sensitive data (admin-read-only by RLS).
 */
export async function screenAndRecord(svc, { userId, text, source = 'chat', sessionId = null }) {
  const result = screenText(text);
  if (!result.flagged || !svc) return result;
  try {
    const snippet = String(text).slice(0, 280);
    await svc.from('safety_events').insert({
      user_id: userId,
      kind: `auto_screen:${result.categories.join(',')}`,
      detail: snippet,
      status: 'open',
      tutoring_session_id: sessionId,
      metadata: { source, severity: result.severity, categories: result.categories, screen: 'v0_pattern' },
    });
    // Critical categories page a human immediately; the rest accrue in the queue.
    if (result.severity === 'critical') {
      const { sendEmail, esc } = await import('@/lib/server/email');
      const admins = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (admins.length) {
        await sendEmail({
          to: admins,
          subject: `[Kaizen SAFETY] ${result.categories.join(', ')} flagged (${source})`,
          html: `<div style="font-family:ui-monospace,monospace;font-size:13px">
            <p><strong>Account:</strong> ${esc(userId)}<br/>
            <strong>Categories:</strong> ${esc(result.categories.join(', '))}<br/>
            <strong>Severity:</strong> ${esc(result.severity)}<br/>
            <strong>Source:</strong> ${esc(source)}</p>
            <p style="color:#B4536F">Review in the safety queue and follow the escalation runbook.</p></div>`,
          kind: 'essential',
        });
      }
    }
  } catch { /* detection must never break the conversation */ }
  return result;
}
