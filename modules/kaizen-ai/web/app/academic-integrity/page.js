import LegalShell from '@/components/LegalShell';
export const metadata = { title: 'Academic Integrity - Kaizen' };

// LegalShell owns the measure, the section rule and the prose rhythm, so this
// page passes flat children and only groups where grouping earns its keep.
//
// The one structural decision here: the will/won't pair IS the argument of the
// policy, and as two stacked bullet lists a reader had to hold the first one in
// their head to feel the second. It reads as a single two-column comparison
// split by a hairline, so the promise and the refusal sit at the same eye line.
//
// The split waits for md rather than sm: a comparison is only worth reading
// side by side once each side still holds a readable line. Below that the two
// lists stack at the full column, which beats two crushed ones.
const SUBHEAD = 'font-brand font-semibold text-t3 text-ink';

const WILL = [
  'Diagnose what you’re actually missing.',
  'Explain in small steps, with hints before solutions.',
  'Give worked examples, then have you try a similar one.',
  'Show full solutions in review mode, after you’ve made a real attempt.',
  'Quiz you and score your understanding honestly.',
];

const WONT = [
  'Write essays or complete graded assignments for submission.',
  'Hand over final homework answers on request.',
  'Help evade proctoring, plagiarism detection, or school rules.',
];

export default function Integrity() {
  return (
    <LegalShell title="Academic Integrity" updated="July 2026">
      <p className="text-t3 text-ink">
        Kaizen exists to build real understanding. A tutor that does your work for you is a
        tutor that makes you weaker. We refuse to be that.
      </p>

      <h2 id="behaviour" className="scroll-mt-24">What the tutor will and won&apos;t do</h2>
      <div className="grid gap-8 md:grid-cols-2 md:gap-8">
        <div>
          <h3 className={SUBHEAD}>It will</h3>
          <ul className="mt-3">
            {WILL.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
        <div className="md:border-l md:border-border md:pl-8">
          <h3 className={SUBHEAD}>It won&apos;t</h3>
          <ul className="mt-3">
            {WONT.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      </div>

      <h2 id="why" className="scroll-mt-24">Why it&apos;s built this way</h2>
      <p>
        Every tutor conversation can be graded on a <span className="font-opmono">0&ndash;5</span>{' '}
        understanding scale, and that score drives your review schedule. Shortcuts would show up
        as failed reviews within days. The system is designed so the only way to look good in
        Kaizen is to actually learn.
      </p>

      <h2 id="teachers" className="scroll-mt-24">For teachers and parents</h2>
      <p>
        Weekly reports show what was practiced, what improved, and what still needs work:
        evidence of learning, not just activity.
      </p>
    </LegalShell>
  );
}
