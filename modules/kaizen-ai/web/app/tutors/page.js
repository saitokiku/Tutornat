// /tutors — the tutor directory, behind a fail-closed gate.
//
// Kaizen sells one recurring product and it is not an hour of a stranger's
// time: a standing seat in an after-school room, taught twice a week by the
// Program Director. A browsable bench of bookable 1:1 tutors is a Wave 2
// product (docs/superpowers/specs/2026-09-02-wave2-geometry.md), and until it
// exists this page may not behave as though it does — it used to end every card
// with the entry price for private 1:1, which is a product we cut.
//
// So the page fails CLOSED on `app_settings.marketplace_enabled`, the same
// posture the booking routes take with `club_enabled`: the switch must be
// explicitly true, an unseeded or unreadable settings table reads as false, and
// nobody can open a directory by forgetting to configure something. The key is
// deliberately NOT `club_enabled` — opening the club sells seats, halls and
// clinics, and none of that is a reason to publish a marketplace.
//
// While the switch is false the page says so in a sentence a parent can read,
// offers nothing, and asks Google not to index it. The directory itself lives
// in components/TutorDirectory.js and mounts only once the switch is on — it is
// in components/ rather than beside this file because test/claims.test.mjs scans
// components/ plus app/**/page.js, so an island co-located here would carry the
// "interviewed and approved by our team" line OUTSIDE the copy guard.

import Shell from '@/components/dn/Shell';
import Reveal from '@/components/dn/Reveal';
import Section from '@/components/ui/Section';
import Button from '@/components/ui/Button';
import { getSettings } from '@/lib/server/context';
import TutorDirectory from '@/components/TutorDirectory';

// The gate is a live read, so the page cannot be prerendered into whichever
// answer happened to be true at build time.
export const dynamic = 'force-dynamic';

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

export async function generateMetadata() {
  const open = await marketplaceOpen();
  return {
    title: open ? 'Our tutors - Kaizen Academic Club' : 'Tutors - Kaizen Academic Club',
    description: open
      ? 'The people who teach at Kaizen: interviewed and approved by our team, for students 13 and up.'
      : 'Kaizen is an in-person after-school club in Austin for students 13 and up. There is no tutor directory to browse.',
    // A page whose whole content is "this is not open" should not be in the
    // index competing with the pages that are. This travels with the gate, so
    // the day the directory opens it becomes indexable without an edit here.
    robots: open ? undefined : { index: false, follow: true },
  };
}

export default async function TutorsPage() {
  const open = await marketplaceOpen();

  if (open) {
    return (
      <Shell active="" tone="day">
        <TutorDirectory />
      </Shell>
    );
  }

  return (
    <Shell active="" tone="day">
      <Section width="prose" lead>
        <Reveal>
          <h1 className="font-brand font-semibold text-ink text-d3 sm:text-d2">
            There is no tutor directory here.
          </h1>
          <p className="mt-6 text-t3 text-muted max-w-[46ch]">
            Kaizen is an after-school club in Austin, not a marketplace: there is no
            bench of profiles to browse, and nothing on this page to book.
          </p>
          <p className="mt-5 text-body text-muted max-w-prose">
            What we run is a room — a small group, in person, after school, taught by the
            person who runs the club. The club pages say what meets, when it meets, and where.
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
