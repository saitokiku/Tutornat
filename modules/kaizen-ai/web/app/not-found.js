import Shell from '@/components/dn/Shell';
import Section from '@/components/ui/Section';
import Button from '@/components/ui/Button';

export const metadata = { title: 'Not found - Kaizen' };

// A 404 is served to someone who followed a stale link, which makes it the one
// page where a way out matters most. It used to render as a bare centred panel
// with no header and no footer, so the only routes offered were the two buttons
// below: the visitor could not reach Tutoring, Pricing, the schedule, or any
// legal page. It now renders inside the standard marketing chrome like every
// other public page. The status code is set in mono, like every other value the
// product asserts, and the mark lives in the header rather than being drawn a
// second time in the body.
//
// THE SECOND ACTION MUST BE A PAGE THAT ANSWERS. It used to read "Find a tutor"
// and point at /tutors, which is now gated shut on `marketplace_enabled` and
// renders "There is no tutor directory here." — so the one page whose whole job
// is rescuing a lost visitor was sending them to a second dead end. It points at
// /tutoring instead, and carries the same two labels the closed /tutors page
// itself offers, so every road out of a broken URL lands on a live one.
// Pinned by test/crawlSurface.test.mjs.
export default function NotFound() {
  return (
    <Shell>
      <Section width="narrow" lead className="text-center">
        <p className="font-opmono text-micro font-medium uppercase text-muted">Error 404</p>
        <h1 className="mt-3 font-brand font-semibold text-d3 text-ink">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-4 text-t3 text-muted">
          The link may be old. Everything you need is a tap away.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/dashboard">Open Kaizen</Button>
          <Button href="/tutoring" variant="secondary">How the club works</Button>
        </div>
      </Section>
    </Shell>
  );
}
