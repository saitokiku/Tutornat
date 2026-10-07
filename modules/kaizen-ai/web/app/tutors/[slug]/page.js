// /tutors/[slug] — a tutor's public profile, behind the same fail-closed gate
// as the directory that links to it.
//
// This was the worst of the three marketplace surfaces: it printed two private
// 1:1 rates, made "Book a session" its primary action, and told a signed-in
// visitor "Your first session is free" — a cut product, a cut purchase path and
// a trial that no longer exists (TRIAL_PLANS is empty). None of that survives.
//
// The gate is `app_settings.marketplace_enabled`, read server-side and failing
// CLOSED exactly as /api/tutoring/sessions fails closed on `club_enabled`: the
// switch must be explicitly true, so an unseeded settings table keeps the page
// shut. The profile itself lives in components/TutorProfile.js and mounts only
// when it is open; while it is shut, a deep link from an old page or an old
// email lands on a page that explains what Kaizen actually is and offers nothing.
//
// The island lives in components/ rather than beside this file so that
// test/claims.test.mjs — which scans components/ plus app/**/page.js — reads it.
// A marketplace island co-located under app/ would sit outside the copy guard,
// which is exactly where the "interviewed and approved by our team" line must
// not be.

import Shell from '@/components/dn/Shell';
import Reveal from '@/components/dn/Reveal';
import Section from '@/components/ui/Section';
import Button from '@/components/ui/Button';
import { getSettings } from '@/lib/server/context';
import TutorProfile from '@/components/TutorProfile';

export const dynamic = 'force-dynamic';

// The directory page's gate, repeated rather than hoisted into a shared module:
// two page files reading one setting is not a library, and the repetition is
// what keeps each page's gate visible in the file a reader opens.
async function marketplaceOpen() {
  // Fails CLOSED on every failure mode, not just on a false value: an unseeded
  // key, an unreadable settings table, a database that is down. A storefront
  // page whose gate cannot be read shows the closed sign — it does not throw a
  // 500 at a parent, and it certainly does not fall open. The failure is logged
  // rather than swallowed, so an outage is distinguishable from a quiet week.
  try {
    const settings = await getSettings();
    return settings.marketplace_enabled === true;
  } catch (err) {
    console.error('[tutors] marketplace gate unreadable, staying closed:', err?.message);
    return false;
  }
}

// Deliberately says nothing about the slug: a profile URL is guessable, and a
// title that confirmed which names exist would leak the roster to anyone with a
// word list. Same title for a real tutor and a typo, until the gate is open.
export async function generateMetadata() {
  const open = await marketplaceOpen();
  return {
    title: open ? 'Tutor profile - Kaizen Academic Club' : 'Tutors - Kaizen Academic Club',
    robots: open ? undefined : { index: false, follow: true },
  };
}

export default async function TutorProfilePage({ params }) {
  const open = await marketplaceOpen();

  if (!open) {
    return (
      <Shell active="" tone="day">
        <Section width="prose" lead>
          <Reveal>
            <h1 className="font-brand font-semibold text-ink text-d3 sm:text-d2">
              Tutor profiles aren’t public yet.
            </h1>
            <p className="mt-6 text-t3 text-muted max-w-[46ch]">
              Kaizen is an after-school club in Austin, not a marketplace, so there is
              no tutor to book by the hour here.
            </p>
            <p className="mt-5 text-body text-muted max-w-prose">
              A seat in the club comes with a named lead tutor, who teaches the same small
              group every week. The club pages say what meets, when it meets, and where.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button href="/tutoring" size="lg">How the club works</Button>
              <Button href="/schedule" variant="secondary" size="lg">This week’s schedule</Button>
            </div>
          </Reveal>
        </Section>
      </Shell>
    );
  }

  // Next 16 hands params in as a promise; the slug is passed down rather than
  // read again from the URL so the client island has no routing opinion.
  const { slug } = await params;
  return (
    <Shell active="" tone="day">
      <TutorProfile slug={slug} />
    </Shell>
  );
}
