# Weekly Rhythm Marketing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public marketing surface (home, /tutoring, /ai, /pricing, /schedule, chrome) around the Weekly Rhythm story, add the AI pricing ladder (Free / AI Solo $15 / AI + Hall $19), and back every UI element with functional plumbing (interest capture, schedule preview mode, plan data).

**Architecture:** Server components render everything from `lib/server/clubPricing.js` (single pricing source) and `publicSchedule()` (single schedule source, gaining a preview mode). A new `club_interest` table + `POST /api/club/interest` backs "get first pick" capture. `WeekStrip` (server) + `InterestForm` (client leaf) are the two new shared components. Three-state law everywhere: LIVE (club_enabled) / HELD (sessions exist, selling held) / EMPTY.

**Tech Stack:** Next.js 16 App Router (JavaScript, RSC-first), Tailwind 3 (existing tokens), Supabase (additive migration), node:test, Playwright.

## Global Constraints

- **Design read:** Redesign-Preserve of a trust-first consumer education brand. Dials: `DESIGN_VARIANCE 6 · MOTION_INTENSITY 4 · VISUAL_DENSITY 3`. Motion = CSS only (existing `fadeUp`/transitions); no new animation deps.
- **Brand tokens preserved (justified brand assets, not new defaults):** Fraunces display + Plus Jakarta sans, warm cream `base`, `accent #B4536F` rose, existing radius scale (`rounded-2xl/3xl` + pill buttons), warm shadows, `SakuraBranch`/`KaizenMark` SVGs, existing `Icons.js` set. No new colors, no new fonts, no new icon family.
- **Theme lock: light.** The existing brand is warm-paper light-only; preserve (deliberate call, recorded here).
- **ZERO em-dashes (`—`) or en-dashes (`–`) in any user-visible string** in files this plan touches. Use comma, period, colon, or hyphen. Code comments exempt. Mechanical check in Task 14.
- **Eyebrow cap:** max 1 uppercase-tracking label per 3 sections per page (hero counts).
- **Hero discipline:** headline ≤ 2 lines desktop, subtext ≤ 20 words, max 4 text elements, real visual (live schedule card = real component preview; never a div-fake).
- **Middle-dot `·` max 1 per line.** The current "$12 · $18 · $30 · $39" strips must be redesigned away.
- **One CTA label per intent per page:** signup intent = "Start free"; first-pick intent = "Get first pick"; schedule intent = "See the schedule".
- **Banned copy (CI-enforced by `web/test/claims.test.mjs`):** `background-checked` (say "interviewed and approved by our team"), guaranteed results/grades, FERPA/HIPAA postures, any entity but **Kaizen Academy LLC**, click-to-cancel/negative-option citations.
- **No unconditional booking promises while HELD.** Every new public claim gets a `docs/CLAIMS_MATRIX.md` row (Task 13).
- **Pricing figures come only from `lib/server/clubPricing.js`** (never retyped): Hall $12, Clinic $18, private $30/$55, Club $39/Plus $69/Max $99, AI Solo **$15**, AI + Hall **$19**.
- Run all commands from `web/` unless noted. Node via `export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH"`.
- Commit after every task; branch `redesign/weekly-rhythm`.

---

### Task 1: AI tiers in clubPricing.js (TDD)

**Files:**
- Modify: `web/lib/server/clubPricing.js`
- Test: `web/test/clubPricing.test.mjs`

**Interfaces:**
- Consumes: existing `CLUB_PLANS`, `planDef()`, `groupSeatQuote()`.
- Produces: `export const AI_PLANS = { ai_solo, ai_hall }` where each is `{ label, priceCents, includedHallMonthly, blurb }`; `planDef()` resolves `ai_hall` so `groupSeatQuote({plan:'ai_hall', kind:'homework_hall', hallRemaining:1})` returns `included`. `isClubMember('ai_hall') === false`.

- [ ] **Step 1: Write the failing tests** (append to `web/test/clubPricing.test.mjs`):

```js
import { AI_PLANS } from '@/lib/server/clubPricing.js'; // add to existing import block

// ── AI ladder (Free / Solo $15 / + Hall $19), decoy pricing ────────────────
test('AI plan prices are $15 (solo) and $19 (+ one Hall visit)', () => {
  assert.equal(AI_PLANS.ai_solo.priceCents, 1500);
  assert.equal(AI_PLANS.ai_hall.priceCents, 1900);
});

test('ai_hall includes exactly 1 Homework Hall visit per month; ai_solo none', () => {
  assert.equal(AI_PLANS.ai_hall.includedHallMonthly, 1);
  assert.equal(AI_PLANS.ai_solo.includedHallMonthly, 0);
});

test('ai_hall Hall visit is included while allowance remains, retail after', () => {
  const withCredit = groupSeatQuote({ plan: 'ai_hall', kind: 'homework_hall', hallRemaining: 1 });
  assert.deepEqual(withCredit, { mode: 'included', amountCents: 0, feature: 'club_hall_included' });
  const spent = groupSeatQuote({ plan: 'ai_hall', kind: 'homework_hall', hallRemaining: 0, seatPriceCents: 1200 });
  assert.equal(spent.mode, 'member');           // has a def, so "member" mode...
  assert.equal(spent.amountCents, 1200);        // ...but priced at retail: no club discount
});

test('AI tiers get NO club discounts: clinic and 1:1 price at retail', () => {
  assert.equal(groupSeatQuote({ plan: 'ai_hall', kind: 'clinic', seatPriceCents: 1800 }).amountCents, 1800);
  assert.equal(privateQuote({ plan: 'ai_hall', minutes: 60 }).amountCents, 5500);
  assert.equal(privateQuote({ plan: 'ai_solo', minutes: 60 }).amountCents, 5500);
});

test('AI tiers are not club members (no member scheduling perks)', () => {
  assert.equal(isClubMember('ai_solo'), false);
  assert.equal(isClubMember('ai_hall'), false);
});
```

- [ ] **Step 2: Run to verify failure**
Run: `npm test 2>&1 | grep -A2 "AI plan prices"`
Expected: FAIL, `AI_PLANS` is not exported.

- [ ] **Step 3: Implement** in `clubPricing.js` (after `RETAIL`):

```js
// The AI ladder (founder, 2026-08-12): Free (daily allowance) · AI Solo $15 ·
// AI + Hall $19. Deliberate decoy structure: Solo exists as an honest choice,
// but $4 more buys one real Homework Hall visit a month (a $12 session), so
// ai_hall is the tier the page diverts to. AI tiers are NOT club memberships:
// no member discounts, no rollover; ai_hall's single visit uses the same
// club_hall_included allowance mechanism (0027 seeds monthly_limit=1).
export const AI_PLANS = {
  ai_solo: {
    label: 'AI Solo',
    priceCents: 1500,
    includedHallMonthly: 0,
    blurb: 'The full companion, every night.',
  },
  ai_hall: {
    label: 'AI + Hall',
    priceCents: 1900,
    includedHallMonthly: 1,
    blurb: 'The full companion, plus one real tutoring session every month.',
  },
};

// Session-pricing def for ai_hall: grants the included visit, then charges
// plain retail (an AI subscriber is not a club member; no discounts).
const AI_SESSION_DEFS = {
  ai_hall: {
    includedHallMonthly: 1,
    memberHallCents: RETAIL.hallSeatCents,
    memberClinicCents: RETAIL.clinicSeatCents,
    private60Cents: RETAIL.private60Cents,
    private30Cents: RETAIL.private30Cents,
    privateCreditMonthly: 0,
  },
};
```

And extend `planDef`:

```js
function planDef(plan) {
  if (plan === 'internal') {
    return { ...CLUB_PLANS.max, memberHallCents: 0, memberClinicCents: 0, private60Cents: 0, private30Cents: 0 };
  }
  return CLUB_PLANS[plan] || AI_SESSION_DEFS[plan] || null;
}
```

- [ ] **Step 4: Run tests** — `npm test 2>&1 | tail -5` Expected: all pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(pricing): AI ladder tiers ai_solo/ai_hall in clubPricing (decoy structure, retail overflow)"`

---

### Task 2: Migration 0027 (club_interest + AI tier entitlements)

**Files:**
- Create: `supabase/migrations/0027_ai_tiers_and_interest.sql`

**Interfaces:**
- Produces: `club_interest(id, email, kind, source, created_at)` unique `(email, kind)`, RLS deny-all (service role only); `plan_entitlements` rows for `ai_solo`/`ai_hall` incl. `('ai_hall','club_hall_included',null,1)`.

- [ ] **Step 1: Write the migration** (mirror 0022's style; additive only):

```sql
-- 0027: AI ladder tiers + interest capture (Weekly Rhythm redesign)
-- 1) club_interest — backs the "get first pick when booking opens" promise
--    on the held storefront. Service-role only; the public API route inserts.
create table if not exists club_interest (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (char_length(email) between 5 and 320),
  kind        text,           -- session kind or plan key the visitor asked about
  source      text,           -- page that captured it: '/', '/schedule', '/pricing', ...
  created_at  timestamptz not null default now(),
  unique (email, kind)
);
alter table club_interest enable row level security;
-- No policies: RLS denies clients everything; only the service role writes/reads.

-- 2) AI ladder entitlements. Free stays as-is; both paid AI tiers share the
--    same elevated AI limits (the tiers differ on the human session, not AI).
insert into plan_entitlements (plan, feature, daily_limit, monthly_limit) values
  ('ai_solo', 'grade',          60,    1200),
  ('ai_solo', 'tutor_message',  300,   6000),
  ('ai_solo', 'tts_chars',      30000, 600000),
  ('ai_solo', 'stt_seconds',    3600,  54000),
  ('ai_solo', 'syllabus_parse', 10,    100),
  ('ai_solo', 'report',         3,     15),
  ('ai_solo', 'courses',        8,     8),
  ('ai_solo', 'handoff',        2,     8),
  ('ai_hall', 'grade',          60,    1200),
  ('ai_hall', 'tutor_message',  300,   6000),
  ('ai_hall', 'tts_chars',      30000, 600000),
  ('ai_hall', 'stt_seconds',    3600,  54000),
  ('ai_hall', 'syllabus_parse', 10,    100),
  ('ai_hall', 'report',         3,     15),
  ('ai_hall', 'courses',        8,     8),
  ('ai_hall', 'handoff',        2,     8),
  ('ai_hall', 'club_hall_included', null, 1),
  ('ai_hall', 'group_seat',     2,     20),
  ('ai_solo', 'group_seat',     2,     20)
on conflict do nothing;
```

- [ ] **Step 2: Verify style parity** — Run: `grep -n "on conflict\|enable row level security" supabase/migrations/0022_club_plans.sql supabase/migrations/0027_ai_tiers_and_interest.sql` and confirm 0022 uses a compatible conflict clause (adjust to match its exact idiom if different).
- [ ] **Step 3: Commit** — `git add supabase/migrations/0027_ai_tiers_and_interest.sql && git commit -m "feat(db): club_interest capture + ai_solo/ai_hall entitlements (0027)"`

*(Founder applies to production alongside the GO_LIVE flow; nothing in the UI hard-fails without it because the interest route degrades per Task 4.)*

---

### Task 3: Stripe wiring for AI tiers

**Files:**
- Modify: `web/lib/server/stripe.js` (PRICE_BY_PLAN, PAID_PLANS)
- Modify: `web/app/api/billing/checkout/route.js` (error copy only)
- Modify: `web/.env.example` (two new vars)
- Test: `web/test/stripe.test.mjs` (create if absent; check first with `ls web/test | grep -i stripe`)

**Interfaces:**
- Produces: `PRICE_BY_PLAN.ai_solo` ← `STRIPE_PRICE_AI_SOLO`, `.ai_hall` ← `STRIPE_PRICE_AI_HALL`; `PAID_PLANS = ['club','plus','max','ai_solo','ai_hall']`.

- [ ] **Step 1: Failing test** (`web/test/stripe.test.mjs`):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAID_PLANS, PRICE_BY_PLAN } from '@/lib/server/stripe.js';

test('AI ladder plans are purchasable and env-mapped', () => {
  assert.ok(PAID_PLANS.includes('ai_solo'));
  assert.ok(PAID_PLANS.includes('ai_hall'));
  assert.ok('ai_solo' in PRICE_BY_PLAN);
  assert.ok('ai_hall' in PRICE_BY_PLAN);
});
```

- [ ] **Step 2: Run** — `npm test 2>&1 | grep -B1 -A3 "AI ladder plans"` Expected: FAIL.
- [ ] **Step 3: Implement** — in `stripe.js` add to `PRICE_BY_PLAN`: `ai_solo: process.env.STRIPE_PRICE_AI_SOLO || null,` and `ai_hall: process.env.STRIPE_PRICE_AI_HALL || null,`; change `PAID_PLANS` to `['club', 'plus', 'max', 'ai_solo', 'ai_hall']`. In `checkout/route.js` change the 400 message to `'Pick a plan (club, plus, max, ai_solo, or ai_hall).'`. Append to `.env.example` under the Stripe block: `STRIPE_PRICE_AI_SOLO=` and `STRIPE_PRICE_AI_HALL=` with a one-line comment `# AI ladder: Solo $15 / + Hall $19 (recurring monthly prices)`.
- [ ] **Step 4: Run tests** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(billing): ai_solo/ai_hall purchasable via env-mapped Stripe prices"`

---

### Task 4: Interest capture (pure validator TDD + route)

**Files:**
- Create: `web/lib/server/interest.js`, `web/app/api/club/interest/route.js`
- Test: `web/test/interest.test.mjs`

**Interfaces:**
- Produces: `validateInterest(body) -> { ok:true, value:{email,kind,source} } | { ok:false, error:string }` (pure); route `POST /api/club/interest` → `{ok:true}` (200) always on valid shape, 400 invalid, 429 burst. Honeypot: non-empty `company` field → pretend success, insert nothing.
- Consumes: `checkRate`, `rateKey` from `@/lib/server/ratelimit`; `serviceClient` from `@/lib/server/context`.

- [ ] **Step 1: Failing tests** (`web/test/interest.test.mjs`):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInterest } from '@/lib/server/interest.js';

test('accepts a plain email, normalizes case and whitespace', () => {
  const r = validateInterest({ email: '  Parent@Example.COM ', kind: 'homework_hall', source: '/schedule' });
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'parent@example.com');
  assert.equal(r.value.kind, 'homework_hall');
});

test('rejects malformed emails and oversized input', () => {
  assert.equal(validateInterest({ email: 'nope' }).ok, false);
  assert.equal(validateInterest({ email: 'a@b.co', kind: 'x'.repeat(64) }).ok, false);
  assert.equal(validateInterest({}).ok, false);
});

test('kind and source are optional, whitelisted-shaped, never required', () => {
  const r = validateInterest({ email: 'a@b.co' });
  assert.equal(r.ok, true);
  assert.equal(r.value.kind, null);
});

test('honeypot: non-empty company field flags the submission', () => {
  const r = validateInterest({ email: 'a@b.co', company: 'totally real' });
  assert.equal(r.ok, true);
  assert.equal(r.value.bot, true);
});
```

- [ ] **Step 2: Run** — Expected: FAIL (module not found).
- [ ] **Step 3: Implement `web/lib/server/interest.js`:**

```js
// Interest capture for the held storefront: pure validation, no I/O, so the
// contract is unit-testable. The route (app/api/club/interest) does the insert.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KIND_MAX = 40;
const SOURCE_MAX = 80;

export function validateInterest(body) {
  const email = String(body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  const kind = body?.kind ? String(body.kind).slice(0, KIND_MAX + 1) : null;
  if (kind && (kind.length > KIND_MAX || !/^[a-z0-9_./-]+$/i.test(kind))) {
    return { ok: false, error: 'Bad request.' };
  }
  const source = body?.source ? String(body.source).slice(0, SOURCE_MAX) : null;
  const bot = Boolean(String(body?.company || '').trim()); // honeypot field
  return { ok: true, value: { email, kind, source, bot } };
}
```

- [ ] **Step 4: Run tests** — Expected: PASS. Commit: `git commit -am "feat(interest): pure validator for first-pick capture"`
- [ ] **Step 5: Implement the route** `web/app/api/club/interest/route.js`:

```js
// POST /api/club/interest — "get first pick when booking opens" capture for
// the held storefront. Public (no auth), burst-limited, honeypotted. Always
// answers {ok:true} on a valid shape so addresses can't be enumerated.
import { serviceClient } from '@/lib/server/context';
import { validateInterest } from '@/lib/server/interest';
import { checkRate, rateKey } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function POST(req) {
  const rate = await checkRate(rateKey(null, req, 'interest'), { limit: 5, windowMs: 60_000 });
  if (!rate.ok) {
    return Response.json({ error: 'Too many requests. Give it a minute.' }, { status: 429 });
  }
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Bad request' }, { status: 400 }); }
  const v = validateInterest(body);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
  if (v.value.bot) return Response.json({ ok: true }); // honeypot: swallow silently

  const svc = serviceClient();
  if (svc) {
    // Upsert on (email, kind): repeat submissions are idempotent, not errors.
    await svc.from('club_interest')
      .upsert(
        { email: v.value.email, kind: v.value.kind, source: v.value.source },
        { onConflict: 'email,kind', ignoreDuplicates: true }
      );
  }
  // Without a DB (local demo) the form still succeeds: the capture is a
  // best-effort list, never a gate in front of the visitor.
  return Response.json({ ok: true });
}
```

- [ ] **Step 6: Full test run + build** — `npm test 2>&1 | tail -3 && npm run build 2>&1 | tail -3` Expected: green, build clean.
- [ ] **Step 7: Commit** — `git commit -am "feat(interest): POST /api/club/interest with rate limit + honeypot"`

---

### Task 5: publicSchedule preview mode

**Files:**
- Modify: `web/lib/server/publicSchedule.js:19-20` and the return at line 57.

**Interfaces:**
- Produces: while `club_enabled !== true`, the function now runs the same query and returns `{ notYetOpen: true, sessions: [...] }` (sanitized rows as before; empty array if none exist). Callers get HELD (rows + notYetOpen) vs EMPTY (no rows) for free. LIVE path unchanged.

- [ ] **Step 1: Implement** — replace line 20's early return:

```js
  const settings = await getSettings();
  // Preview mode: while selling is held (club_enabled=false) the storefront
  // still SHOWS the real week, it just can't sell it. Booking routes keep
  // their own hard gate (fail closed), so this exposes zero purchase paths.
  const notYetOpen = settings.club_enabled !== true;
```

Then thread it through both returns: `if (!rooms?.length) return { sessions: [], notYetOpen };` and the final `return { notYetOpen, sessions: ... }`.

- [ ] **Step 2: Grep the callers to confirm no gating regressions** — Run: `grep -rn "publicSchedule\|notYetOpen" web/app web/components web/lib --include=*.js | grep -v node_modules`. Confirm booking routes (`api/tutoring/sessions`, `api/tutoring/group`, `api/tutoring/directory`) do NOT use publicSchedule (they have their own gate). Callers to update in later tasks: `app/page.js`, `app/tutoring/page.js`, `components/ScheduleBrowser.js`, `app/api/club/schedule/route.js` (verify it just proxies the function's result).
- [ ] **Step 3: Build** — `npm run build 2>&1 | tail -3` Expected: clean.
- [ ] **Step 4: Commit** — `git commit -am "feat(schedule): preview mode, show-but-never-sell while club_enabled is off"`

---

### Task 6: Week bucketing helper (TDD) + WeekStrip component

**Files:**
- Create: `web/lib/weekBuckets.js`, `web/components/WeekStrip.js`
- Test: `web/test/weekBuckets.test.mjs`

**Interfaces:**
- Produces: `bucketWeek(sessions, now) -> [{ key:'mon', label:'Mon', date:Date, isToday:boolean, sessions:[...] }, ... 7 entries starting today]`; `<WeekStrip sessions state="live|held|empty" compact />` server component. Every page task consumes `WeekStrip`.

- [ ] **Step 1: Failing tests** (`web/test/weekBuckets.test.mjs`):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketWeek } from '@/lib/weekBuckets.js';

const NOW = new Date('2026-08-12T15:00:00Z'); // a Wednesday

test('produces 7 day buckets starting today', () => {
  const days = bucketWeek([], NOW);
  assert.equal(days.length, 7);
  assert.equal(days[0].isToday, true);
  assert.ok(days.every((d) => typeof d.label === 'string' && d.label.length === 3));
});

test('assigns sessions to their local day bucket, in order', () => {
  const sessions = [
    { id: 'b', start: '2026-08-14T21:00:00Z' },
    { id: 'a', start: '2026-08-14T18:00:00Z' },
  ];
  const days = bucketWeek(sessions, NOW);
  const friday = days.find((d) => d.sessions.length > 0);
  assert.deepEqual(friday.sessions.map((s) => s.id), ['a', 'b']);
});

test('ignores sessions outside the 7-day window', () => {
  const days = bucketWeek([{ id: 'x', start: '2026-08-25T18:00:00Z' }], NOW);
  assert.equal(days.every((d) => d.sessions.length === 0), true);
});
```

- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Implement `web/lib/weekBuckets.js`:**

```js
// Pure Mon-Sun bucketing for the WeekStrip: 7 buckets starting today, each
// session dropped into its local day. No I/O, no timezone database: the
// strip renders in the server's zone, which matches how times are shown
// everywhere else on the storefront (toLocaleString on ISO strings).
export function bucketWeek(sessions = [], now = new Date()) {
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() + i * 86400000);
    return {
      key: date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      isToday: i === 0,
      sessions: [],
    };
  });
  const sorted = [...sessions].sort((a, b) => new Date(a.start) - new Date(b.start));
  for (const s of sorted) {
    const idx = Math.floor((startOfDay(new Date(s.start)) - today) / 86400000);
    if (idx >= 0 && idx < 7) days[idx].sessions.push(s);
  }
  return days;
}
```

- [ ] **Step 4: Run tests** — Expected: PASS. Commit: `git commit -am "feat(weekstrip): pure week bucketing helper"`
- [ ] **Step 5: Build `web/components/WeekStrip.js`** (server component, no hooks). Contract:
  - Props: `{ sessions = [], state = 'held', compact = false, highlight = 'club' }`. `highlight='ai'` inverts emphasis (nights lit plum, anchors dim) for `/ai`.
  - Renders a 7-column grid (`grid grid-cols-7 gap-1.5 sm:gap-2`): each day cell shows the 3-letter label, session anchors as small rose blocks (kind label + local time, `bg-accent/10 text-accent`), and a plum "AI" night marker on every day (`bg-plum/10 text-plum`, label "AI, every night" rendered once as a legend in compact mode rather than per-cell noise).
  - `state='empty'`: renders the same grid populated from a hardcoded `ILLUSTRATIVE_WEEK` constant (Tue Hall, Wed Clinic, Thu Community free) with a visible caption: `"An illustrative week. Real times post here."` No fake tutor names, no fake seat counts.
  - `state='held'`: real rows, per-cell price chips, no booking affordance (parent page supplies the InterestForm CTA).
  - `state='live'`: same, cells link to `/schedule`.
  - Mobile: `compact` collapses to a horizontal scroll-snap row (`flex overflow-x-auto snap-x`), full variant stays 7-col but drops per-session time detail below `sm`.
  - Today's cell gets `ring-1 ring-accent/30` and a `font-semibold` label; no decorative dots.
- [ ] **Step 6: Build + visual smoke** — `npm run build 2>&1 | tail -3`. Expected: clean.
- [ ] **Step 7: Commit** — `git commit -am "feat(weekstrip): WeekStrip server component, live/held/empty states"`

---

### Task 7: InterestForm client component

**Files:**
- Create: `web/components/InterestForm.js`

**Interfaces:**
- Produces: `'use client'` leaf. Props `{ kind = null, source = '/', buttonLabel = 'Get first pick', inline = false }`. Label above input (never placeholder-as-label), hidden `company` honeypot input (`className="hidden" tabIndex={-1} autoComplete="off"`), posts JSON to `/api/club/interest`, three states: idle → submitting (button disabled, `opacity-60`) → success (`"You're on the list. We'll email you when booking opens."`) with inline error text below the input on 4xx/429 (`text-bad text-[12px] mt-1`).
- Consumes: Task 4's route.

- [ ] **Step 1: Implement.** Form skeleton (style with `k-input`, `k-btn-primary`; `inline` renders input+button in one row `flex gap-2`, stacked otherwise):

```jsx
'use client';
import { useState } from 'react';

export default function InterestForm({ kind = null, source = '/', buttonLabel = 'Get first pick', inline = false }) {
  const [status, setStatus] = useState('idle'); // idle | busy | done | error
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus('busy'); setError('');
    try {
      const res = await fetch('/api/club/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), company: form.get('company'), kind, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
      setStatus('done');
    } catch (err) {
      setStatus('error'); setError(err.message);
    }
  }

  if (status === 'done') {
    return <p className="text-[14px] font-medium text-good">You're on the list. We'll email you when booking opens.</p>;
  }
  /* form JSX per contract above */
}
```

- [ ] **Step 2: Build** — clean. **Step 3: Commit** — `git commit -am "feat(interest): InterestForm client leaf (idle/busy/done/error)"`

---

### Task 8: Chrome (MarketingShell + footer copy)

**Files:**
- Modify: `web/components/MarketingShell.js`

**Interfaces:**
- Produces: header nav exactly `Tutoring · Schedule · AI · Pricing` + "Open Kaizen" pill ("Find a tutor" and "Become a tutor" leave the header; both remain in the footer link row). Footer tagline em-dash removed: `改善, kaizen: the belief that small, steady improvement outgrows any single leap. Kaizen serves students ages 13 and up.` Everything else (active-state API, width prop, Stars export) unchanged so no caller breaks.

- [ ] **Step 1: Implement.** Keep the `NAV` array shape (`{key, href, label, hide}`) so `active` matching still works; delete the two header entries, keep footer entries.
- [ ] **Step 2: Grep for breakage** — `grep -rn "active=\"\(tutors\|apply\)\"" web/app --include=*.js` → those pages keep working (unknown key = no highlight; acceptable).
- [ ] **Step 3: Build + commit** — `git commit -am "feat(chrome): nav tightened to the four-story surface, footer keeps the long tail"`

---

### Task 9: Home page rewrite (`web/app/page.js`)

**Files:**
- Rewrite: `web/app/page.js`

**Interfaces:**
- Consumes: `publicSchedule` (preview mode), `WeekStrip`, `InterestForm`, `MarketingShell`, `SakuraBranch`, `CLUB_PLANS`/`RETAIL`/`AI_PLANS` from clubPricing (server import for figures).

Structure (7 sections, ≥4 layout families, ≤3 eyebrows, zero em-dashes):

1. **Hero (asymmetric split, NOT centered):** left column: eyebrow `The after-school academic club · ages 13+` (eyebrow #1, keeps the one allowed `·`), H1 `A standing weekly place to get schoolwork done.` (Fraunces, `text-[44px] lg:text-[64px] tracking-tight leading-[1.03]`), subtext ≤20 words: `Real tutors on a weekly schedule. An AI study companion every school night in between. From free.` CTAs: primary `Get first pick` opens/reveals the InterestForm (held) or `See the schedule` → `/schedule` (live); secondary `Start free` → `/dashboard`. Right column: **the real schedule card** (`k-card`, up to 4 rows from `publicSchedule`, each: weekday+time, topic, price; held ⇒ a quiet `Booking opens soon` line + InterestForm inline variant; empty ⇒ WeekStrip `state="empty"`). SakuraBranch stays as the corner decoration (existing brand asset).
2. **The week (full-width band):** H2 `One week with Kaizen.` + `WeekStrip` full variant + two single-sentence captions: rose `Tuesday, Homework Hall. Thursday, the free Community Hall.` / plum `Every night in between, the AI companion keeps the record moving.`
3. **The club (split, text left / fact column right):** H2 `The tutoring club.` Body (from clubPricing figures): Hall $12 supervised with a tutor working the room, Clinics $18 small-group, private from $30, one free Community Hall every week. Membership math one-liner: `Eight Halls a la carte run $96 a month. Plus is $69 for the same eight visits.` CTA: `Explore tutoring` → `/tutoring`.
4. **The AI, standing alone (split mirrored):** H2 `A tutor, not an answer machine.` Body: hints before answers, syllabus to calendar, mastery counted only when a student gets it right on their own, later. Ladder teaser rendered from `AI_PLANS`: `Free, with a real daily allowance` / `AI Solo $15` / `AI + Hall $19, with one real tutoring session every month`. CTA: `Meet the companion` → `/ai`, plus the page-wide `Start free` secondary.
5. **One record (narrow centered band, `bg-panel` bordered):** H2 `One record of what your student actually knows.` Three short lines (no cards): the AI works with it every night; a tutor reads it before every session; parents see all of it. No mastery-breadth claims.
6. **Primary care band:** keep the existing two paragraphs (they are good copy), rewritten only to remove em-dashes; kanji line becomes `改善, kaizen: continuous, gradual improvement.` CTAs: `Try a free session` → `/schedule?kind=community_free` (held ⇒ InterestForm with kind `community_free`), `See pricing` → `/pricing`.
7. **Integrity strip:** keep, em-dash sweep only.

- [ ] **Step 1: Implement** per structure. `export const revalidate = 60;` stays; `metadata` rewritten (title `Kaizen: the after-school academic club and AI study companion`, description ≤160 chars, claims-safe, no held-booking promises).
- [ ] **Step 2: Verify** — `npm run build && npm test 2>&1 | tail -3`; then `grep -n "—\|–" web/app/page.js` → must return nothing in string literals; eyebrow count ≤ 3: `grep -c "uppercase tracking" web/app/page.js` ≤ 3.
- [ ] **Step 3: Commit** — `git commit -am "feat(home): Weekly Rhythm landing, schedule-first hero, three-state CTAs"`

---

### Task 10: /ai page rewrite

**Files:**
- Rewrite: `web/app/ai/page.js`

Structure (6 sections): hero (eyebrow `The AI study companion`, H1 `A tutor, not an answer machine.` kept, subtext ≤20 words, CTAs `Start free` + `See pricing` → `/pricing#ai`); teaching-contract section kept nearly as-is (4 cards, its strongest asset) with em-dash sweep; **WeekStrip `highlight="ai"`** band (`Every school night. That's the AI's shift.`); **the ladder** rendered from `AI_PLANS` + free tier as a 3-card pricing row where `ai_hall` is visually primary (`ring-2 ring-accent`, `Most value` chip) and the Solo card carries the divert nudge: `For $4 more, get a real tutor session every month.` CTAs: Free → `Start free` (`/dashboard`); paid → `/billing?plan=ai_solo|ai_hall` when Stripe env configured, else InterestForm (kind = plan key). Config check server-side: `const buyable = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_AI_SOLO && process.env.STRIPE_PRICE_AI_HALL);` **one-record band** (same as home §5, shortened); **bridge to the club** (`When it's time for a human, you're already home.` → `/tutoring`).

- [ ] **Step 1: Implement.** — [ ] **Step 2: Verify** (build, tests, em-dash grep, eyebrow count ≤ 2 for 6 sections). — [ ] **Step 3: Commit** `git commit -am "feat(ai): standalone product page with the decoy ladder"`

---

### Task 11: /pricing rewrite

**Files:**
- Rewrite: `web/app/pricing/page.js`

Structure: hero (H1 `Priced like a club, not a rescue.`, subtext ≤20 words, no banner strip of dot-separated prices); **`Every night` half** with anchor `id="ai"`: Free / AI Solo / AI + Hall cards from `AI_PLANS` (decoy layout identical to /ai, single source of layout: extract a small server component `web/components/AiLadder.js` used by both pages, `buyable` passed as prop); **à-la-carte section** (Hall, Clinic, private, Community free; grouped chunks, no hairline-per-row table); **`Every week` half**: Club/Plus/Max grid driven by `CLUB_PLANS` (replace the page's hand-typed PLANS array; Plus keeps `Most popular`); membership-math section kept; fine print gains: `AI + Hall includes one Homework Hall visit each calendar month. It doesn't roll over.` All purchase CTAs: `buyable ? /billing?plan=X : InterestForm(kind=X)`; club CTAs additionally held while `club_enabled` is off (pass `notYetOpen` from `publicSchedule({days:1})` or simply also gate on `buyable` since Stripe is unconfigured today; implement `buyable` for club plans as `STRIPE_PRICE_CLUB/PLUS/MAX` checks).

- [ ] **Step 1: Extract `AiLadder.js`** (server component, props `{ buyable, compact }`). — [ ] **Step 2: Rewrite page**; update `web/test/clubPricing.test.mjs` expectations only if figures render through a helper (figures themselves unchanged). — [ ] **Step 3: Verify** (build, tests, em-dash grep, `grep -n "Choose Club\|Choose Plus\|Choose Max" web/app/pricing/page.js` still present for analytics continuity). — [ ] **Step 4: Commit** `git commit -am "feat(pricing): one story in dollars, AI ladder + club, state-aware CTAs"`

---

### Task 12: /tutoring align + /schedule held storefront

**Files:**
- Modify: `web/app/tutoring/page.js` (hero tighten, WeekStrip insert, state-aware CTAs, one-record band, em-dash sweep; keep problem rows / ladder / membership math / honesty block)
- Modify: `web/app/schedule/page.js` + `web/components/ScheduleBrowser.js`

ScheduleBrowser changes: it receives `notYetOpen` + real rows now (preview mode). When `notYetOpen && sessions.length`: render rows exactly as live minus the `Book` button, replaced per-row by a small `Get first pick` button that expands one shared `InterestForm` (kind = row.kind, source `/schedule`); banner over the list: `Booking opens soon. The schedule below is real; leave an email and you pick first.` When `notYetOpen && !sessions.length`: WeekStrip `state="empty"` + InterestForm. Live path byte-identical to today.

- [ ] **Step 1: /tutoring edits.** — [ ] **Step 2: /schedule + browser edits.** — [ ] **Step 3: Verify** (build, tests, em-dash grep both files, zigzag cap on /tutoring: max 2 consecutive split sections). — [ ] **Step 4: Commit** `git commit -am "feat(tutoring,schedule): held storefront that shows real rows and captures first-pick"`

---

### Task 13: Billing page AI tiers + claims matrix rows

**Files:**
- Modify: `web/app/billing/page.js` (locate the plan-card list: `grep -n "club\|plus\|max" web/app/billing/page.js | head`; add ai_solo/ai_hall cards with the same card shape, labels `AI Solo $15` / `AI + Hall $19`, one-line inclusions)
- Modify: `docs/CLAIMS_MATRIX.md` (append rows)

Claims rows to append (verdict TRUE once implemented, each with evidence):

```markdown
| /pricing, /ai | AI Solo $15/mo; AI + Hall $19/mo | TRUE | `AI_PLANS` in clubPricing.js; pinned by clubPricing.test.mjs | KEEP |
| /pricing, /ai | AI + Hall includes 1 Homework Hall visit per calendar month, no rollover | TRUE | `ai_hall.includedHallMonthly=1`; 0027 seeds `club_hall_included` monthly_limit 1; groupSeatQuote test | KEEP |
| /, /schedule, /tutoring | "We'll email you when booking opens" (first-pick capture) | TRUE | `club_interest` table + POST /api/club/interest; send is a manual founder action via Resend | KEEP |
| /, /schedule | Schedule rows shown while booking is held | TRUE | publicSchedule preview mode; booking APIs still 503 behind club_enabled | KEEP |
```

- [ ] **Step 1: Billing cards.** — [ ] **Step 2: Claims rows.** — [ ] **Step 3: Verify + commit** `git commit -am "feat(billing,claims): AI tier cards + claims-matrix rows for every new public claim"`

---

### Task 14: Full verification sweep (pre-flight)

- [ ] **Step 1: Mechanical checks** (all from `web/`):

```bash
npm run build 2>&1 | tail -3                        # clean
npm test 2>&1 | tail -5                             # all green (incl. claims + legalMarkers)
npm run lint 2>&1 | tail -3
# em/en-dash ban across every touched surface (string content):
grep -n "—\|–" app/page.js app/ai/page.js app/pricing/page.js app/tutoring/page.js app/schedule/page.js components/MarketingShell.js components/WeekStrip.js components/InterestForm.js components/AiLadder.js components/ScheduleBrowser.js
# → zero hits in user-visible strings (comments acceptable, prefer zero)
# eyebrow cap per page:
for f in app/page.js app/ai/page.js app/pricing/page.js app/tutoring/page.js; do echo "$f: $(grep -c 'uppercase tracking' $f)"; done
```

- [ ] **Step 2: e2e** — extend `web/e2e/smoke.spec.js`: assert `/` contains `A standing weekly place`, `/ai` contains `answer machine`, `/pricing` contains `AI Solo`; run `npm run test:e2e`.
- [ ] **Step 3: The design-taste pre-flight matrix** (Section 14 of the skill) run against each page; fix failures inline.
- [ ] **Step 4: Commit** — `git commit -am "test(marketing): e2e coverage for the Weekly Rhythm surface"`

---

### Task 15: PR

- [ ] `git push -u origin redesign/weekly-rhythm` and open a PR to `main` with `gh pr create`, body: summary, three-state law, new claims rows, founder to-dos ($15/$19 confirm, Stripe prices, migration apply, Vercel settings). End body with the standard attribution footer.
