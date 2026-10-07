// The AI ladder: Free / the one upgrade (ai_solo, labelled from AI_PLANS — "Max AI") / AI + Hall. Server component; every figure
// renders from clubPricing.AI_PLANS and RETAIL (never retyped), and the gap
// between the two paid tiers is computed here rather than written down, so a
// reprice cannot leave a stale sentence behind.
//
// Three CTA modes: `buyable` sends ai_solo to /billing?plan=; ai_hall
// additionally requires `hallSellable`, because it bundles a real tutor session
// and a held club cannot deliver one.
//
// WHY THE RECOMMENDATION SITS ON THE MIDDLE TIER (2026-09-02).
// AI + Hall used to be the featured tier: the only raised surface, the only
// accent border, the only primary button, marked "Our pick". It is also the one
// tier nobody can buy — STRIPE_PRICE_AI_HALL stays unset by decision, so every
// visitor who took the recommendation landed on an email capture. A storefront
// may only recommend what a family can actually buy today. The tier is NOT
// deleted: SALE_STATUS says `active`, built and disclosed but unwired, and that
// is the founder's call — so it keeps its column, its figures and its terms,
// and its note now says plainly that it is not open yet. What moved is the
// recommendation, the surface and the primary button, onto Max AI.
//
// EACH TIER GATES ON ITS OWN STRIPE PRICE, and the callers must keep it that
// way. Until 2026-08-28 both pages computed one `aiBuyable` that required
// STRIPE_PRICE_AI_SOLO *and* STRIPE_PRICE_AI_HALL, so wiring either tier alone
// silently held the OTHER one in capture state — the storefront showing a plan
// it cannot sell, which is the same defect class as the sixteen days when
// /pricing rendered five plans with no live Stripe Price behind any of them.
// The prop was called `hallDeliverable` then; it is `hallSellable` now because
// it answers "can this tier be sold", which is pricing AND deliverability, not
// deliverability alone.
// When a tier is not deliverable it links to the page's ONE capture section
// (`captureHref`); only where a page provides no such section does the card
// embed the capture form itself.
//
// EVERY BULLET ON THE PAID CARD NAMES A CEILING A ROUTE ACTUALLY ENFORCES
// (2026-09-02). The middle bullet used to read "your whole schedule, not two
// courses". `DEFAULT_LIMITS.free.courses = 2` is real data, but nothing reads
// it: `checkEntitlement(caller, 'courses')` is called from no route, `courses`
// is absent from the FEATURES list in /api/entitlements/me, and lib/cloud.js
// upserts every course row a device syncs with no gate at all. A free student
// can already track their whole schedule, so the card was selling the lifting
// of a ceiling that does not exist — on the one tier a family can buy, in its
// only substantive line. It now sells `syllabus_parse`, which /api/intake,
// /api/intake/ingest and /api/parse-syllabus all check before they spend, and
// test/entitlements.test.mjs pins each bullet against the limit table AND
// against the set of features a route really gates. If the courses ceiling is
// ever meant to be real, gate it in the sync/create path first, then claim it.
//
// Shape: three tiers on ONE shared row grid. The parent declares five rows —
// title, price, blurb, what it includes, action — and each tier is a subgrid
// spanning all five, so a title can only ever land on the title band and the
// three prices share a baseline. Two rules keep that honest and are the whole
// reason the columns used to drift apart:
//   1. every tier emits the same five cells with the same top margins, which
//      is why they are rendered by one <Tier>, not typed three times;
//   2. vertical padding is identical on all three, because a subgrid inset by
//      its own padding starts its first row that much lower. Horizontal
//      padding is free, so only the recommended tier carries a surface and the
//      other two stay chromeless. Three equal boxes ask the reader to compare
//      three things; this asks them to compare rows and choose one. The
//      recommended tier now sits BETWEEN the other two, so its own border does
//      the separating that a hairline used to do — a rule a few units away
//      from that border would read as a second, accidental one.
import { AI_PLANS, RETAIL, formatPrice as dollars } from '@/lib/server/clubPricing';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InterestForm from '@/components/InterestForm';

// One tier, as the five cells of the shared grid. Mono carries the figure,
// because the price is a thing the record asserts; the spec sheet under it is
// ruled like a table rather than bulleted, so the three tiers read across.
function Tier({
  tone = 'day',
  featured = false,
  name,
  mark = null,
  amount,
  per = null,
  blurb,
  items,
  strong = false,
  note = null,
  className = '',
  children,
}) {
  const night = tone === 'night';
  const label = night ? 'text-paper' : 'text-ink';
  const quiet = night ? 'text-nightmuted' : 'text-muted';
  const rule = night ? 'divide-nightline' : 'divide-border';
  const markColor = night ? 'text-ember' : 'text-accent';
  const lines = strong ? (night ? 'text-paper/90' : 'text-ink') : quiet;

  return (
    <Card
      variant={featured ? 'raised' : 'plain'}
      tone={tone}
      pad="none"
      className={[
        'flex flex-col md:grid md:grid-rows-subgrid md:row-span-5 md:py-6 lg:py-8',
        // The featured tier's hairline is real; the other two carry a
        // transparent one so the 1px does not shift their first row.
        featured ? '' : 'border border-transparent',
        className,
      ].filter(Boolean).join(' ')}
    >
      {/* 1 · Title. The recommendation rides the plan name rather than a
          floating pill: four different "Our pick" badges is how the last
          system drifted. */}
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={`font-brand text-t3 font-semibold ${label}`}>{name}</h3>
        {mark ? <span className={`text-xs font-medium ${markColor}`}>{mark}</span> : null}
      </div>

      {/* 2 · Price. One size for all three, so the figures can be compared. */}
      <p className="mt-2 font-opmono tabular-nums">
        <span className={`text-t1 lg:text-d3 font-semibold ${label}`}>{amount}</span>
        {per ? <span className={`ml-1.5 text-xs ${quiet}`}>{per}</span> : null}
      </p>

      {/* 3 · What it is, in one line. */}
      <p className={`mt-3 text-sm ${quiet}`}>{blurb}</p>

      {/* 4 · What it includes. The tallest of the three sets this band, so the
          actions below stay on one line. */}
      <div className="mt-6">
        <ul className={`divide-y ${rule}`}>
          {items.map((line, i) => (
            <li key={i} className={`py-2.5 text-sm ${lines}`}>{line}</li>
          ))}
        </ul>
        {note ? <p className={`mt-4 text-xs ${markColor}`}>{note}</p> : null}
      </div>

      {/* 5 · Action. */}
      <div className="mt-8">{children}</div>
    </Card>
  );
}

export default function AiLadder({
  buyable = false,
  hallSellable = false,
  tone = 'day',
  source = '/pricing',
  captureHref = null,
  className = '',
}) {
  const solo = AI_PLANS.ai_solo;
  const hall = AI_PLANS.ai_hall;
  // NOT `buyable && ...` — ai_solo's price must never gate ai_hall's card.
  const hallBuyable = hallSellable;
  const night = tone === 'night';

  return (
    <div
      className={`grid gap-10 md:grid-cols-[1fr_1.2fr_1fr] md:grid-rows-[auto_auto_auto_1fr_auto] md:gap-0 ${className}`}
    >
      {/* Free: the funnel, and a real product. Deliberately the quietest tier. */}
      <Tier
        tone={tone}
        name="Free"
        amount={dollars(0)}
        blurb="The full learning loop, with daily limits."
        className="md:pr-6 lg:pr-8"
        items={[
          'The study companion, in chat',
          'Homework calendar and gradebook',
          'Mastery tracking',
          'The free weekly Community Hall',
        ]}
      >
        <Button href="/dashboard" variant="secondary" tone={tone} block>Start free</Button>
      </Tier>

      {/* The one upgrade (solo.label), and the only paid AI tier a family can
          buy today — so it is the tier that carries the surface. */}
      <Tier
        tone={tone}
        featured
        mark="Our pick"
        name={solo.label}
        amount={dollars(solo.priceCents)}
        per="/mo"
        blurb="The same companion, with the ceilings raised."
        strong
        className={`p-6 md:px-6 lg:p-8 md:mx-6 lg:mx-8 ${night ? 'border-ember/50' : 'border-accent/40 shadow-lift'}`}
        items={[
          'Everything in Free',
          'Five times the daily tutoring allowance',
          'Thirty syllabus and homework imports a day, not ten',
          'Three weekly reports instead of one',
        ]}
        note={<>Month to month. Cancel any time from your billing page.</>}
      >
        {buyable ? (
          <Button href="/billing?plan=ai_solo" variant="primary" tone={tone} block>
            {`Choose ${solo.label}`}
          </Button>
        ) : captureHref ? (
          <Button href={captureHref} variant="primary" tone={tone} block>
            Get first pick
          </Button>
        ) : (
          <InterestForm kind="ai" source={source} buttonLabel="Get first pick" tone={tone} />
        )}
      </Tier>

      {/* AI + Hall: disclosed, priced, and not open. It states the gap to the
          tier above rather than restating it in prose, so a reprice cannot
          leave the sentence behind. */}
      <Tier
        tone={tone}
        name={hall.label}
        amount={dollars(hall.priceCents)}
        per="/mo"
        blurb="The companion and a human tutor, on one bill."
        className="md:pl-6 lg:pl-8"
        items={[
          `Everything in ${solo.label}`,
          <>
            <b className="font-semibold">One Homework Hall visit each month</b>, a seat that
            sells a la carte for{' '}
            <span className="font-opmono">{dollars(RETAIL.hallSeatCents)}</span>
          </>,
          'The visit resets monthly and doesn’t bank',
        ]}
        note={hallBuyable ? null : (
          <>
            <span className="font-opmono">{dollars(hall.priceCents - solo.priceCents)}</span> more
            than {solo.label}, and not open yet.
          </>
        )}
      >
        {hallBuyable ? (
          <Button href="/billing?plan=ai_hall" variant="secondary" tone={tone} block>
            Choose AI + Hall
          </Button>
        ) : captureHref ? (
          <Button href={captureHref} variant="secondary" tone={tone} block>
            Get first pick
          </Button>
        ) : (
          <InterestForm kind="ai" source={source} buttonLabel="Get first pick" tone={tone} />
        )}
      </Tier>
    </div>
  );
}
