// Server-side request context: auth, entitlements, usage, kill switches.
// The SERVICE ROLE KEY never leaves this module tree. Never import from client code.
import { createClient } from '@supabase/supabase-js';
import { sendEmail, esc } from '@/lib/server/email';

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Demo mode (no auth, no metering) must only ever be a LOCAL-DEV state. It used
// to be inferred from `URL_ && ANON`, while serviceClient() keys off
// `URL_ && SERVICE` — two different predicates. A deploy carrying the service
// role key but missing the anon key therefore got `{demo:true}` callers (which
// isAdminCaller treated as admin) against a live, RLS-bypassing database.
// NEXT_PUBLIC_* are inlined at BUILD time while SUPABASE_SERVICE_ROLE_KEY is
// read at RUNTIME, so that skew is a realistic deploy accident, not a theory.
//
// Now: any sign of a real backend (either key present) means this is NOT demo.
export const cloudConfigured = Boolean(URL_ && (ANON || SERVICE));

// A service key with no anon key is never intentional — fail loudly at import
// rather than silently degrading to open admin.
if (SERVICE && !ANON) {
  throw new Error(
    'Supabase misconfigured: SUPABASE_SERVICE_ROLE_KEY is set but ' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is not. Refusing to start — this combination ' +
    'previously degraded the API to unauthenticated open-admin.'
  );
}

export function serviceClient() {
  if (!URL_ || !SERVICE) return null;
  return createClient(URL_, SERVICE, { auth: { persistSession: false } });
}

// ── Age posture ───────────────────────────────────────────────────────────────
// Everything we know about a person's age comes from a number they typed into a
// browser, and the browser holds the anon key: anyone can call supabase.auth
// .signUp() directly and omit birth_year entirely. The old rule read
// `is_minor = birthYear ? age < 18 : false` — i.e. NO STATED AGE MEANT ADULT,
// which handed the omission path a clean bypass of the entire guardian gate.
//
// So there are three postures, not two, and the third is the one that matters:
//
//   'adult'   — a plausible stated birth year putting them at 18+
//   'minor'   — a plausible stated birth year putting them under 18
//   'unknown' — no birth year, or one we refuse to use (see below)
//
// 'unknown' is treated as a minor everywhere it counts (guardianGateSatisfied,
// the managed-child creator check). That is deliberately the annoying
// direction: the reverse mistake puts a 14-year-old alone in a video room with
// a stranger. This does not VERIFY anyone's age — nothing here does — it only
// stops a blank field from being read as an attestation of adulthood.
//
// Below 13 is 'unknown' rather than 'minor' on purpose: 13 is the product floor
// (docs/legal/REVIEW_QUEUE.md), so a stated age under it is a lie, a typo, or an
// account we cannot serve — never a usable age claim.
//
// THE WAY OUT MATTERS AS MUCH AS THE RULE. Migration 0007 added birth_year as
// NULL to every row that already existed, so 'unknown' is not a rare edge — it
// is every account older than the column, this one included. For one week those
// accounts were refused at every live-booking entry point with no remedy at
// all: birth_year is written only at profile insert, 0011 revokes client UPDATE
// on the column, and the guardian path wants a guardian address nobody had ever
// been asked for. The refusal even told them we had emailed a guardian who did
// not exist.
//
// So there is a one-time self-declaration: decideSelfDeclaredBirthYear below,
// wrapped by POST /api/account/birth-year. An account with NO year on file may
// state one once — service-role write, audit-logged, refused outright if a year
// is already stored. That is not a weakening of the rule. Typing your birth year
// is exactly what signup collects, so the remedy sits at precisely the trust
// level of the door it re-opens; what stays true is the thing that mattered —
// an ABSENT year never reads as adult. Someone has to say it.
export const MIN_STATED_AGE = 13;
export const MAX_STATED_AGE = 110;

// The single place that decides whether a number a human typed is usable as a
// stated birth year AT ALL. Signup reads it out of browser-written auth
// metadata; the self-declaration route reads it out of a form. Same rule both
// times, on purpose — a remedy that accepted more than the original door would
// be a wider door. Returns the integer year, or null for anything we refuse.
//
// The window here (120 years) is wider than MAX_STATED_AGE (110) deliberately:
// a wildly implausible year is still STORED verbatim at signup so support can
// see what was claimed, and agePosture is what declines to use it.
export function normalizeStatedBirthYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  const thisYear = new Date().getFullYear();
  if (year > thisYear || year < thisYear - 120) return null;
  return year;
}

// ── Guardian email: the FIRST address (audit A4) ─────────────────────────────
// The address that matters most was the least defended one. CHANGING an
// already-set guardian email goes through POST /api/family/guardian-consent,
// which validates its shape, refuses the account's own address, freezes the
// field once a consent has actually been recorded, caps re-pointing at three
// per thirty days, and audit-logs every move. The FIRST address went through
// none of that: it arrives as auth metadata on supabase.auth.signUp and is
// written straight onto the profile below. The browser holds the anon key, so
// that metadata is attacker-controlled, and the "guardian email must be
// different from your own" rule existed only in components/LoginPage.js — i.e.
// it was advice, not a rule. A signup posted directly at Supabase could name
// the student's own inbox, and the account was created already-consentable by
// its own owner.
//
// So the rule is re-derived here, at the write.
//
// WHAT THIS DOES AND DOES NOT PROVE. It proves the address on the row is not,
// on its face, the account's own mailbox. It does NOT establish that the
// recipient is an adult, that they are a parent, or even that they are a
// different person — a second inbox is free, and email-only consent is exactly
// as strong as owning an inbox. Whether emailed confirmation is an adequate
// consent method for a minor at all is not settled here and is not settled
// anywhere in this repo: it is docs/legal/REVIEW_QUEUE.md item 16, a pre-flip
// counsel gate. This raises the floor. That is the whole claim.
//
// Plus-tags are folded before comparing, because sam+mom@x.com and sam@x.com
// are one mailbox at every provider that implements subaddressing, and that is
// a one-keystroke walk around a bare string comparison. Gmail's
// dots-are-ignored rule is deliberately NOT applied: it is one provider's
// policy rather than an email rule, and at a domain that honours dots
// first.last@ and firstlast@ can be two different people — a false positive
// there costs a real parent their approval email.
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Fold an address to the mailbox it actually reaches, for comparison only —
// never for storage or sending, where the address as typed is what we owe the
// recipient. Anything that isn't address-shaped is returned as-is so it can
// only ever compare equal to itself.
function mailboxKey(address) {
  const at = address.lastIndexOf('@');
  if (at <= 0) return address;
  const local = address.slice(0, at);
  const domain = address.slice(at + 1);
  return `${local.split('+')[0] || local}@${domain}`;
}

export function guardianEmailIsSelf(accountEmail, guardianEmail) {
  const account = String(accountEmail || '').trim().toLowerCase();
  const guardian = String(guardianEmail || '').trim().toLowerCase();
  if (!account || !guardian) return false;
  return mailboxKey(account) === mailboxKey(guardian);
}

/**
 * What the profile insert stores for a guardian address, kept out here beside
 * the rule for the same reason decideSelfDeclaredBirthYear is: the decision is
 * the part worth pinning, and getCaller is only the shell that writes it.
 *
 * Returns { email, refusal }. `email` is what to store — null whenever there is
 * nothing we are willing to record — and `refusal` is why, for the audit row.
 * A refusal is never an error handed back to the caller: signup proceeds, the
 * account simply lands with no guardian on file and has to use the /settings
 * path, which validates, caps and audit-logs the address it finally records.
 *
 * An unusable address is refused for the same reason a self-named one is. It
 * would otherwise sit on the row looking like a guardian on file — enough to
 * stop the "send us an address" prompt from ever appearing, while every send
 * against it fails.
 */
export function decideSignupGuardianEmail(accountEmail, stated, isMinor) {
  const statedGuardian = String(stated || '').trim().toLowerCase() || null;
  if (!isMinor || !statedGuardian) return { email: null, refusal: null, stated: statedGuardian };
  if (guardianEmailIsSelf(accountEmail, statedGuardian)) {
    return { email: null, refusal: 'self_named', stated: statedGuardian };
  }
  if (!EMAIL_SHAPE.test(statedGuardian)) {
    return { email: null, refusal: 'unusable_address', stated: statedGuardian };
  }
  return { email: statedGuardian, refusal: null, stated: statedGuardian };
}

export function agePosture(profile) {
  const year = Number(profile?.birth_year);
  const age = Number.isInteger(year) ? new Date().getFullYear() - year : NaN;
  if (!Number.isFinite(age) || age < MIN_STATED_AGE || age > MAX_STATED_AGE) return 'unknown';
  if (age < 18) return 'minor';
  // A stored is_minor=true outranks the arithmetic: support can flag an account
  // as a minor, and that flag must never be argued away by a birth year.
  return profile?.is_minor === true ? 'minor' : 'adult';
}

/**
 * The self-declaration rule, kept here beside agePosture because it is the same
 * law read backwards. Pure: it takes the row as it stands plus whatever the
 * form sent, and returns either the patch to write or the refusal to hand back
 * verbatim. POST /api/account/birth-year is only the shell around it — auth,
 * the atomic write, the audit row.
 *
 * Three rules, and the reasons they are these three:
 *
 *   ONCE. If a year is already stored we refuse, and we key that off the stored
 *   VALUE rather than the posture. A row holding an under-13 or implausible
 *   year also reads 'unknown', and letting that one be "corrected" to 1990 is
 *   the bypass this whole file exists to prevent. A wrong year on file costs a
 *   support conversation; that is the right price.
 *
 *   UNDER 13 IS REFUSED, NOT STORED. 13 is the product floor everywhere else
 *   (signup, app/api/family/children). Writing the claim would also freeze the
 *   row forever at an age we cannot serve, since the ONCE rule would then
 *   refuse every later correction.
 *
 *   is_minor IS RE-DERIVED from the stated year. Everywhere else a stored
 *   is_minor=true outranks the arithmetic, and that stays true — but a `true`
 *   sitting on a row with NO birth year is not a support judgement, it is
 *   getCaller's own fail-safe echoing the absent year back at us (see the
 *   profile insert below, which writes exactly that pair). Once a year is
 *   stated there is nothing left for it to stand in for. A flag that must
 *   survive has to be recorded next to a birth year — and a row that has one is
 *   untouchable here.
 */
export function decideSelfDeclaredBirthYear(profile, stated) {
  if (profile?.birth_year != null) {
    return {
      ok: false, status: 409, code: 'birth_year_already_set',
      error: 'Your birth year is already on file. If it’s wrong, contact support and we’ll correct it.',
    };
  }
  const birthYear = normalizeStatedBirthYear(stated);
  if (birthYear == null) {
    return {
      ok: false, status: 400, code: 'birth_year_invalid',
      error: 'Enter the four-digit year you were born, e.g. 1998.',
    };
  }
  const age = new Date().getFullYear() - birthYear;
  if (age < MIN_STATED_AGE) {
    return {
      ok: false, status: 400, code: 'under_13_unsupported',
      error: 'Kaizen currently serves students ages 13 and up — support for younger students is coming.',
    };
  }
  if (age > MAX_STATED_AGE) {
    return {
      ok: false, status: 400, code: 'birth_year_invalid',
      error: 'That birth year doesn’t look right — check it and try again.',
    };
  }
  return {
    ok: true,
    age,
    patch: { birth_year: birthYear, is_minor: agePosture({ birth_year: birthYear }) !== 'adult' },
  };
}

// Resolve the caller. Returns:
//  { demo: true }        — Supabase not configured (local dev / demo mode)
//  { user, profile }     — authenticated
//  null                  — configured but missing/invalid token (→ 401)
export async function getCaller(req) {
  if (!cloudConfigured) return { demo: true };
  const authz = req.headers.get('authorization') || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return null;
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data?.user) return null;

  const svc = serviceClient();
  let profile = null;
  if (svc) {
    const { data: p } = await svc.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    profile = p;
    if (!profile) {
      // first API call after signup — create the profile row
      const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const isAdmin = admins.includes((data.user.email || '').toLowerCase());
      // Age posture (stated at signup, carried in auth metadata): under-13 is
      // blocked at signup; 13–17 is a minor and live-video booking stays locked
      // until the guardian clicks the consent link we email them here.
      //
      // FAIL-SAFE (audit A1): a signup that carries no usable birth year is
      // stored as a MINOR with no guardian email, not as an adult. The browser
      // writes this metadata with the anon key, so omitting the field used to
      // mint an account the guardian gate waved straight through. An unverified
      // account now lands in the same place a teen does: the gate refuses live
      // video and the UI asks for a guardian email (/api/family/guardian-consent
      // POST accepts one from any account that is not a verified adult).
      // The stated year is still stored verbatim when it is a sane number, so
      // support can see what was claimed; agePosture decides whether to use it.
      // An account that lands here with birthYear null is not stuck: it can
      // state a year once via POST /api/account/birth-year (see
      // decideSelfDeclaredBirthYear).
      //
      // SELF-CONSENT (audit A4): the stated guardian address is stored only if
      // it is usable and is not the account's own mailbox — the rule is
      // decideSignupGuardianEmail above. A refused address is not a refused
      // SIGNUP — the row is created with guardian_email null, which is the
      // ordinary state of every account older than 0007 and is already handled
      // end to end: the gate refuses live video, and BookModal and /settings
      // ask for an address through /api/family/guardian-consent, where it is
      // validated, capped and audit-logged. Refusing the signup outright would
      // buy nothing a second tab cannot walk around, and would strand the
      // honest typo — a parent's address mistyped into the student's field.
      const meta = data.user.user_metadata || {};
      const birthYear = normalizeStatedBirthYear(meta.birth_year);
      const isMinor = agePosture({ birth_year: birthYear }) !== 'adult';
      const guardian = decideSignupGuardianEmail(data.user.email, meta.guardian_email, isMinor);
      const guardianEmail = guardian.email;
      const ins = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || '',
        role: isAdmin ? 'admin' : 'student',
        plan: isAdmin ? 'internal' : 'free',
        birth_year: birthYear,
        is_minor: isMinor,
        guardian_email: guardianEmail,
      };
      let { data: created, error: insErr } = await svc.from('profiles').insert(ins).select().maybeSingle();
      if (insErr) {
        // Deployment hasn't run migration 0007 yet — fall back to the base
        // columns so signup never breaks; age fields apply once migrated.
        const base = { id: ins.id, email: ins.email, name: ins.name, role: ins.role, plan: ins.plan };
        ({ data: created } = await svc.from('profiles').insert(base).select().maybeSingle());
      }
      profile = created || ins;
      if (isMinor && guardianEmail && profile.guardian_consent_token) {
        sendGuardianConsentEmail(profile).catch(() => {});
      }
      // An account that asked to be its own guardian is exactly the signal a
      // human safety review is looking for, and it is invisible once the field
      // is simply null — so leave the row. Best-effort: audit_logs is
      // admin-read-only (0001/0019) and this must never fail a signup.
      if (guardian.refusal) {
        auditLog(data.user.id, 'guardian.signup_email_refused', data.user.id, {
          reason: guardian.refusal, stated: guardian.stated, account: (data.user.email || '').toLowerCase(),
        }).catch(() => {});
      }
      // first time we've seen this user — welcome them (best-effort, non-blocking)
      // Email styles are inlined (no Tailwind in email clients). The hex values
      // ARE the live tokens from tailwind.config.js: #FCFBF9 = base/paper,
      // #211D1A = ink, #756E67 = muted, #B4536F = accent.
      if (ins.email) {
        sendEmail({
          to: ins.email,
          subject: 'Welcome to Kaizen 🌸',
          html: `
            <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#211D1A;background:#FCFBF9;padding:28px;border-radius:16px">
              <h2 style="font-size:20px;color:#211D1A">Welcome to Kaizen${ins.name ? ', ' + esc(ins.name) : ''} 🌸</h2>
              <p style="font-size:14px;line-height:1.6;color:#756E67">
                Your account is ready. Three steps make the first study session count:
              </p>
              <ol style="font-size:14px;line-height:1.8;color:#756E67">
                <li><strong>Tell it about your classes</strong> — paste a syllabus or just type what you're taking.</li>
                <li><strong>Open an assignment and tap Tutor</strong> — it leads with a question and gives the smallest hint that unblocks you.</li>
                <li><strong>Grade a session</strong> — Kaizen schedules the review before you'd forget.</li>
              </ol>
              <p style="font-size:14px;line-height:1.6;color:#756E67">
                Stuck on anything? Just reply to this email.
              </p>
              <p style="font-size:13px;color:#756E67">— The Kaizen team · <span style="color:#B4536F">改善</span> means "small change for the better"</p>
            </div>`,
          kind: 'promo',
        }).catch(() => {});
      }
    }
  }
  // Study Circle: a free-plan member of an active circle gets AI Student
  // benefits — the owner's $59.99 'family' subscription carries up to 4 students.
  if (profile && (profile.plan === 'free' || !profile.plan) && svc) {
    try {
      const { data: membership } = await svc.from('plan_group_members')
        .select('group_id, plan_groups!inner(owner_id)')
        .eq('user_id', data.user.id).maybeSingle();
      // See circle/route.js — embedded resources may be object or array.
      const embedded = /** @type {any} */ (membership?.plan_groups);
      const ownerId = Array.isArray(embedded) ? embedded[0]?.owner_id : embedded?.owner_id;
      if (ownerId) {
        const { data: ownerSub } = await svc.from('subscriptions')
          .select('status,plan').eq('user_id', ownerId).maybeSingle();
        if (ownerSub && ['active', 'trialing'].includes(ownerSub.status) && ownerSub.plan === 'family') {
          profile = { ...profile, plan: 'student', via_circle: true };
        }
      }
    } catch { /* pre-0008 schema — no circles yet */ }
  }
  return { user: data.user, profile };
}

// Guardian notice + consent request for a minor's account (13–17). Live-video
// booking stays locked until the guardian clicks the consent link. Exported so
// the resend path (/api/family/guardian-consent POST) can reuse it.
//
// Returns sendEmail's `{ sent, ... }` verdict rather than swallowing it, and
// `{ sent:false, reason:'no_link' }` when there is nothing to send. The resend
// route TELLS THE USER an email went out, so it needs to know whether one did:
// with no RESEND_API_KEY (rule 6) or no consent token this is a no-op, and
// "we emailed your guardian" would be the same lie this whole path was fixed
// for. Fire-and-forget callers can keep ignoring the result.
export async function sendGuardianConsentEmail(profile) {
  if (!profile?.guardian_email || !profile?.guardian_consent_token) {
    return { sent: false, reason: 'no_link' };
  }
  const base = (process.env.APP_URL || '').replace(/\/$/, '');
  const link = `${base}/api/family/guardian-consent?t=${profile.guardian_consent_token}`;
  // Inline email palette = live tokens (tailwind.config.js): #211D1A = ink,
  // #756E67 = muted, #B4536F = accent.
  return sendEmail({
    to: profile.guardian_email,
    subject: 'Your student joined Kaizen — parent approval needed for live tutoring',
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#211D1A">
        <h2 style="font-size:19px">A Kaizen account was created for your student</h2>
        <p style="font-size:14px;line-height:1.6;color:#756E67">
          ${esc(profile.name || 'Your student')} (${esc(profile.email)}) created a Kaizen account and told us
          you're their parent or guardian. Kaizen is an AI study tool with optional <b>live 1:1 video
          tutoring</b> from human tutors interviewed and approved by our team.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#756E67">
          The AI study tools work right away. <b>Live video sessions stay locked</b> until you approve them:
        </p>
        <p style="text-align:center;margin:20px 0">
          <a href="${link}" style="background:#B4536F;color:#fff;padding:12px 22px;border-radius:12px;
             text-decoration:none;font-weight:600;font-size:14px">Approve live tutoring</a>
        </p>
        <p style="font-size:12px;line-height:1.6;color:#756E67">
          Didn't expect this? Don't click the button — reply to this email and we'll look into the
          account. You can withdraw approval or request deletion of your student's data any time by
          replying to this email. Our child-safety practices: ${base}/safety
        </p>
      </div>`,
    kind: 'essential',
  });
}

// ── App settings (kill switches) with 60s cache ──────────────────────────────
let settingsCache = { at: 0, value: null };
export async function getSettings() {
  const svc = serviceClient();
  // No service client: the AI-only local mode. Voice is false here for the
  // same reason it seeds false — nothing sells it, and the fallback should
  // not switch on a paid vendor that the configured system has switched off.
  if (!svc) return { tutor_enabled: true, voice_enabled: false, expensive_models_enabled: true, maintenance_mode: false };
  if (settingsCache.value && Date.now() - settingsCache.at < 60000) return settingsCache.value;
  const { data } = await svc.from('app_settings').select('key,value');
  const value = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  settingsCache = { at: Date.now(), value };
  return value;
}
export function bustSettingsCache() { settingsCache = { at: 0, value: null }; }

// ── Entitlements ──────────────────────────────────────────────────────────────
// syllabus_parse is metered per FILE now (magic box at scale), so the daily
// caps are sized for real batches, not single syllabi. stt_seconds caps voice
// input (audit SEC-006). 'plus' is a legacy tier — no longer purchasable
// (SHIP-008) but grandfathered accounts keep working limits.
// `grade` is metered here too. It was the one paid Claude route with no
// entitlement at all — only the 20/min burst limiter stood between a free
// account and ~29k grading calls a day on 60k-char transcripts. Sized to the
// realistic ratio of graded sessions to tutor messages (roughly 1:2), so it
// never bites a genuine user.
// Club lineup (0022): 'club' ($39) and 'max' ($99) are new membership tiers;
// 'plus' is reused as the $69 hero tier. 'student'/'family' are retired from
// sale but keep working limits for any account still carrying them. The club_*
// keys drive the Academic Club: club_hall_included is the monthly Homework
// Hall allowance (4/8/12 — the real cap lives in plan_entitlements
// monthly_limit; these dailies are same-day ceilings), club_private_credit is
// dormant (no tier includes one today), and group_seat is the daily anti-abuse
// cap on ANY group booking.
export const DEFAULT_LIMITS = {
  free:     { tutor_message: 40,   grade: 20,   tts_chars: 5000,   stt_seconds: 600,   syllabus_parse: 10,   report: 1,   courses: 2,   handoff: 1,   club_hall_included: 0,    club_private_credit: 0,    group_seat: 3 },
  student:  { tutor_message: 200,  grade: 100,  tts_chars: 30000,  stt_seconds: 3600,  syllabus_parse: 60,   report: 3,   courses: 8,   handoff: 2,   club_hall_included: 0,    club_private_credit: 0,    group_seat: 3 },
  club:     { tutor_message: 200,  grade: 100,  tts_chars: 30000,  stt_seconds: 3600,  syllabus_parse: 60,   report: 3,   courses: 8,   handoff: 2,   club_hall_included: 4,    club_private_credit: 0,    group_seat: 5 },
  // AI ladder (clubPricing.AI_PLANS): club-level AI limits, no club perks.
  // Monotone by test: free ≤ ai tiers ≤ club on every AI feature.
  ai_solo:  { tutor_message: 200,  grade: 100,  tts_chars: 30000,  stt_seconds: 3600,  syllabus_parse: 30,   report: 3,   courses: 8,   handoff: 2,   club_hall_included: 0,    club_private_credit: 0,    group_seat: 2 },
  ai_hall:  { tutor_message: 200,  grade: 100,  tts_chars: 30000,  stt_seconds: 3600,  syllabus_parse: 30,   report: 3,   courses: 8,   handoff: 2,   club_hall_included: 1,    club_private_credit: 0,    group_seat: 2 },
  plus:     { tutor_message: 400,  grade: 200,  tts_chars: 60000,  stt_seconds: 7200,  syllabus_parse: 150,  report: 5,   courses: 12,  handoff: 4,   club_hall_included: 8,    club_private_credit: 0,    group_seat: 5 },
  max:      { tutor_message: 400,  grade: 200,  tts_chars: 60000,  stt_seconds: 7200,  syllabus_parse: 150,  report: 6,   courses: 16,  handoff: 4,   club_hall_included: 12,   club_private_credit: 0,    group_seat: 5 },
  // The standing seat: Max-level AI limits (the seat includes "AI practice
  // between sessions at the highest limits", STRATEGY §5.1) + 9 seat sessions.
  seat:     { tutor_message: 400,  grade: 200,  tts_chars: 60000,  stt_seconds: 7200,  syllabus_parse: 150,  report: 6,   courses: 16,  handoff: 4,   club_hall_included: 0,    club_private_credit: 0,    group_seat: 5, club_seat_included: 9 },
  family:   { tutor_message: 400,  grade: 200,  tts_chars: 60000,  stt_seconds: 7200,  syllabus_parse: 150,  report: 6,   courses: 16,  handoff: 4,   club_hall_included: 0,    club_private_credit: 0,    group_seat: 5 },
  internal: { tutor_message: 1e6,  grade: 1e6,  tts_chars: 1e8,    stt_seconds: 1e6,   syllabus_parse: 1e4,  report: 1e4, courses: 1e4, handoff: 1e4, club_hall_included: 1000, club_private_credit: 1000, group_seat: 1000 },
};

// All limits for a plan: hardcoded fallbacks overlaid with plan_entitlements
// rows. Returns { feature: dailyLimit|null } (null = no cap configured).
export async function getPlanLimits(plan) {
  const limits = { ...(DEFAULT_LIMITS[plan] || DEFAULT_LIMITS.free) };
  const svc = serviceClient();
  if (svc) {
    const { data } = await svc.from('plan_entitlements')
      .select('feature,daily_limit').eq('plan', plan);
    for (const row of data || []) {
      limits[row.feature] = row.daily_limit; // null in DB = unlimited
    }
  }
  return limits;
}

export async function checkEntitlement(caller, feature, quantity = 1) {
  if (caller.demo) return { ok: true, demo: true };
  const plan = caller.profile?.plan || 'free';
  const svc = serviceClient();
  if (!svc) return { ok: true };

  let limit = DEFAULT_LIMITS[plan]?.[feature] ?? DEFAULT_LIMITS.free[feature] ?? 0;
  let monthlyLimit = null;
  const { data } = await svc.from('plan_entitlements')
    .select('daily_limit,monthly_limit').eq('plan', plan).eq('feature', feature).maybeSingle();
  if (data && data.daily_limit != null) limit = data.daily_limit;
  if (data && data.monthly_limit != null) monthlyLimit = data.monthly_limit;

  // One query since month start covers both windows; split for today in JS.
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const { data: rows } = await svc.from('usage_ledger')
    .select('quantity,created_at')
    .eq('user_id', caller.user.id)
    .eq('feature', feature)
    .gte('created_at', monthStart.toISOString());
  let used = 0, usedMonth = 0;
  for (const r of rows || []) {
    const q = Number(r.quantity);
    usedMonth += q;
    if (new Date(r.created_at) >= dayStart) used += q;
  }
  if (used + quantity > limit) {
    return {
      ok: false,
      reason: `Daily ${feature.replace(/_/g, ' ')} limit reached (${limit}) on the ${plan} plan.`,
      used, limit,
    };
  }
  if (monthlyLimit != null && usedMonth + quantity > monthlyLimit) {
    return {
      ok: false,
      reason: `Monthly ${feature.replace(/_/g, ' ')} limit reached (${monthlyLimit}) on the ${plan} plan.`,
      used: usedMonth, limit: monthlyLimit,
    };
  }
  return { ok: true, used, limit };
}

// ── Usage metering (service-role insert; RLS blocks client writes) ───────────
export async function recordUsage(caller, feature, quantity, estCostUsd = 0, metadata = {}) {
  if (caller.demo) return;
  const svc = serviceClient();
  if (!svc) return;
  await svc.from('usage_ledger').insert({
    user_id: caller.user.id,
    feature,
    quantity,
    est_cost_usd: estCostUsd,
    metadata,
  });
}

export async function auditLog(actorId, action, target, detail = {}) {
  const svc = serviceClient();
  if (!svc) return;
  await svc.from('audit_logs').insert({ actor_id: actorId, action, target, detail });
}

// Admin check. Fails CLOSED: a demo caller is an ANONYMOUS caller (no token was
// ever inspected), so it must never be admin. The previous
// `if (caller.demo) return true` meant that any deployment which lost its
// Supabase env vars served an unauthenticated, fully-open admin API — and CI
// builds with no env vars, so that was the only path automated tests exercised.
// Local-dev admin comes from ADMIN_EMAILS, which already works below.
export function isAdminCaller(caller) {
  if (!caller || caller.demo) return false;
  if (caller.profile?.role === 'admin') return true;
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = (caller.user?.email || '').toLowerCase();
  return Boolean(email) && admins.includes(email);
}
