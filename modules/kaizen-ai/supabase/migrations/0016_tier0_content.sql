-- 0016_tier0_content.sql — the canonical content layer. Spec §5.4 Tier 0.
-- Additive and idempotent. Run after 0015.
--
-- WHY THIS EXISTS
-- The hint ladder (0015 item_attempt) records how much help was consumed, and
-- the policy engine decides which rung of worked-example -> completion ->
-- independent a learner is on. Neither had anywhere to READ the actual content
-- from: there was no table for worked examples, no table for hint chains, and
-- no table for self-explanation menus. The ladder was a mechanism with nothing
-- to serve.
--
-- Tier 0 is FROZEN content: LLM-drafted, expert-verified, versioned, immutable
-- in production, with a kill switch. Unverified generation into this table is
-- banned — a tutor's canonical errors are trusted errors, and one confidently
-- wrong hint travels through a classroom faster than any feature ships.
--
-- Contrast Tier 1 (kc_item, 0012): generated freely, because correctness is
-- checked mechanically rather than trusted.

create table if not exists kc_content (
  id uuid primary key default uuid_generate_v4(),
  kc_id uuid not null references kc(id) on delete cascade,

  -- explanation     canonical prose for the concept
  -- worked_example  a full solution with visible reasoning (not just steps —
  --                 making expert thinking visible is the point)
  -- hint            one rung of the ladder; `level` orders them
  -- self_explain    §4.1 F-7 menu-based "why did this step work?"
  -- solution        the bottom-out full solution shown after attempts are spent
  kind text not null check (kind in ('explanation','worked_example','hint','self_explain','solution')),

  -- Hint ordering: 1 = orient, 2 = teach the step. Null for non-hints.
  level int,

  body text not null,

  -- self_explain only: choices + the correct index + why each wrong one is wrong.
  -- Menu form is used because open-response self-explanation is expensive to
  -- assess and this retains a usable share of the effect while staying
  -- machine-checkable.
  choices jsonb not null default '[]',
  answer_index int,
  choice_feedback jsonb not null default '[]',

  -- Ties a worked example / hint to the specific error it addresses, so the
  -- ladder can serve the hint that matches the mistake actually made rather
  -- than the next one in sequence.
  misconception_id uuid references kc_misconception(id) on delete set null,

  context_tag text,
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft','verified','retired')),
  verified_by text,
  verified_at timestamptz,
  author_of_record text,
  error_reports int not null default 0,
  -- Kill switch: flip to true and this asset stops being served immediately,
  -- without a deploy.
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table kc_content enable row level security;
drop policy if exists "admin kc content" on kc_content;
create policy "admin kc content" on kc_content for all using (is_admin());
-- Served through /api/engine/session, which strips answer keys from
-- self_explain items. No direct client access.
revoke select, insert, update, delete on kc_content from anon, authenticated;
create index if not exists kc_content_serve_idx on kc_content (kc_id, kind, status, disabled);
create index if not exists kc_content_hint_idx on kc_content (kc_id, kind, level) where kind = 'hint';

-- One-tap "this looks wrong" from inside a session. Content trust is a top-five
-- risk: the response target is a kill switch inside 24h, which needs a queue.
create table if not exists content_report (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  content_id uuid references kc_content(id) on delete cascade,
  item_id uuid references kc_item(id) on delete cascade,
  note text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','invalid')),
  created_at timestamptz not null default now(),
  check (content_id is not null or item_id is not null)
);
alter table content_report enable row level security;
drop policy if exists "admin content report" on content_report;
create policy "admin content report" on content_report for all using (is_admin());
revoke select, insert, update, delete on content_report from anon, authenticated;
create index if not exists content_report_open_idx on content_report (status, created_at desc);

create or replace function increment_content_error(p_content uuid)
  returns void language sql security definer set search_path = public, pg_temp
as $$
  update kc_content set error_reports = error_reports + 1 where id = p_content;
$$;
revoke all on function increment_content_error(uuid) from public, anon, authenticated;
grant execute on function increment_content_error(uuid) to service_role;

-- ── Seed Tier-0 content for the existing bank ────────────────────────────────
-- Hand-written and verified. Enough to exercise the full ladder end to end on
-- the fractions -> linear-equations chain seeded in seed_kc.sql.

insert into kc_content (kc_id, kind, level, body, status, verified_by, verified_at, author_of_record)
select kc.id, c.kind, c.level, c.body, 'verified', 'seed:hand-verified', now(), 'seed'
from kc join (values
  -- Adding fractions with unlike denominators
  ('math-add-fractions-unlike', 'worked_example', null,
   E'**1/2 + 1/3**\n\nThe denominators name how big each piece is. Halves and thirds are different sizes, so we cannot add them yet — we need the same size piece.\n\n**Step 1 — find a shared size.** Sixths work: 2 and 3 both divide 6.\n\n**Step 2 — rewrite each fraction in sixths.**\n1/2 = 3/6 (multiply top and bottom by 3)\n1/3 = 2/6 (multiply top and bottom by 2)\n\n**Step 3 — now the pieces match, so add the tops only.**\n3/6 + 2/6 = 5/6\n\nThe denominator stays 6 because the piece size did not change — we only counted how many.'),
  ('math-add-fractions-unlike', 'hint', 1,
   'Look at the denominators. Are the pieces the same size yet? You can only add the tops once the bottoms match.'),
  ('math-add-fractions-unlike', 'hint', 2,
   'Find a number both denominators divide into, rewrite each fraction over it — remembering to multiply the top by the same amount — then add only the numerators.'),

  -- Two-step equations
  ('math-solve-two-step', 'worked_example', null,
   E'**Solve 2x + 6 = 10**\n\nThink of it as undoing what was done to x, in reverse order.\n\nx was multiplied by 2, *then* 6 was added. So to undo, remove the 6 first, then divide.\n\n**Step 1 — subtract 6 from both sides.**\n2x + 6 - 6 = 10 - 6\n2x = 4\n\n**Step 2 — divide both sides by 2.**\nx = 2\n\n**Check it.** 2(2) + 6 = 10. ✓\n\nAlways check — it costs five seconds and catches most mistakes.'),
  ('math-solve-two-step', 'hint', 1,
   'Two things were done to x. Which one do you undo first? Reverse the order they were applied in.'),
  ('math-solve-two-step', 'hint', 2,
   'Strip the added or subtracted term from both sides first, so only the multiplied part is left. Then divide.'),

  -- Distributive property
  ('math-distribute', 'worked_example', null,
   E'**Expand 3(x + 4)**\n\nThe 3 outside multiplies *everything* inside the bracket, not just the first term.\n\n3 × x = 3x\n3 × 4 = 12\n\nSo 3(x + 4) = 3x + 12\n\nA way to see it: 3 groups of (x + 4) is 3 x''s and 3 fours.'),
  ('math-distribute', 'hint', 1,
   'The number outside reaches every term inside the bracket. How many terms are in there?'),
  ('math-distribute', 'hint', 2,
   'Multiply the outside number by the first term, then by the second term, and add the results.'),

  -- Comparing fractions
  ('math-compare-fractions', 'worked_example', null,
   E'**Which is larger, 1/3 or 1/8?**\n\nThe instinct is that 8 is bigger than 3, so 1/8 must be bigger. That instinct is exactly backwards here.\n\nThe denominator says how many pieces the whole was cut into. Cut a pizza into 3 and each slice is large. Cut the same pizza into 8 and each slice is small.\n\nMore pieces → smaller pieces.\n\nSo **1/3 > 1/8**.')
) as c(slug, kind, level, body) on kc.slug = c.slug
where not exists (
  select 1 from kc_content x where x.kc_id = kc.id and x.kind = c.kind
    and coalesce(x.level, -1) = coalesce(c.level, -1)
);

-- §4.1 F-7: menu-based self-explanation. Machine-checkable, so it can run at
-- zero marginal cost and still feed the learner model.
insert into kc_content (kc_id, kind, body, choices, answer_index, choice_feedback, status, verified_by, verified_at, author_of_record)
select kc.id, 'self_explain', c.body, c.choices::jsonb, c.answer_index, c.feedback::jsonb,
       'verified', 'seed:hand-verified', now(), 'seed'
from kc join (values
  ('math-add-fractions-unlike',
   'In that example, why did we rewrite both fractions over 6 before adding?',
   '["Because the pieces had to be the same size before they could be counted together","Because 6 is the larger denominator","Because you always use 6 with fractions","Because it makes the numbers bigger"]',
   0,
   '["Exactly — the denominator names the piece size, and you can only add pieces that match.","Not quite. It is not about which denominator is larger — it is that both must describe the same size piece.","Not quite. The shared denominator depends on the two fractions; 6 just happens to work for halves and thirds.","Not quite. Rewriting does not change the value at all — it only changes how it is written."]'),
  ('math-solve-two-step',
   'Why did we subtract 6 before dividing by 2?',
   '["Because undoing happens in reverse order — the 6 was added last, so it comes off first","Because subtraction is always done before division","Because 6 is smaller than 10","Because dividing first is not allowed"]',
   0,
   '["Right — reverse the order the operations were applied in.","Not quite. This is not the order-of-operations rule; it is about undoing in reverse.","Not quite — the sizes of the numbers do not decide the order.","You can divide first, it just makes it messier: you would have to divide every term, including the 6."]'),
  ('math-distribute',
   'Why is 3(x + 4) not equal to 3x + 4?',
   '["Because the 3 multiplies every term inside the bracket, including the 4","Because you cannot multiply letters and numbers","Because brackets mean addition","Because 3x + 4 is not simplified"]',
   0,
   '["Exactly — 3 groups of (x + 4) contains 3 fours, not one.","Not quite — multiplying a number by a variable is fine, that part is right.","Not quite — brackets group terms; the operation inside is still addition.","Not quite — 3x + 4 is fully simplified, it is just not equivalent to the original."]')
) as c(slug, body, choices, answer_index, feedback) on kc.slug = c.slug
where not exists (
  select 1 from kc_content x where x.kc_id = kc.id and x.kind = 'self_explain'
);

select 'tier0 content seeded' as status,
       (select count(*) from kc_content where kind = 'worked_example') as worked_examples,
       (select count(*) from kc_content where kind = 'hint') as hints,
       (select count(*) from kc_content where kind = 'self_explain') as self_explain;

-- Session hint counter, incremented atomically from the hint ladder.
create or replace function increment_session_hints(p_session uuid)
  returns void language sql security definer set search_path = public, pg_temp
as $$
  update learning_session set hints_used = hints_used + 1 where id = p_session;
$$;
revoke all on function increment_session_hints(uuid) from public, anon, authenticated;
grant execute on function increment_session_hints(uuid) to service_role;
