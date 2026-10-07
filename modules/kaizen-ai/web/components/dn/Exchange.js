// A Socratic exchange, typeset as a transcript. Not a fake app window and not
// a screenshot: it is an illustrative exchange written to mirror how
// buildSocraticPrompt actually behaves, demonstrating the teaching contract
// (hints before answers, the student does the thinking) more honestly than any
// feature list. The footer states the one observable fact — the final answer
// is absent — and leaves the conclusion to the reader.
//
// Set as a record, not as chat bubbles: speaker in the gutter, turns separated
// by hairlines, one reading column. Nothing here is a message UI, because there
// is no product screen to imitate honestly at this size.
import Card from '@/components/ui/Card';

const TURNS = [
  { who: 'Student', text: 'what is 2x + 6 = 20, just give me x' },
  { who: 'Kaizen', text: 'Almost there on your own. What would you do first to get the 2x by itself?' },
  { who: 'Student', text: 'subtract 6 from both sides? so 2x = 14' },
  { who: 'Kaizen', text: 'That’s the move. One step left, and it’s yours.' },
];

export default function Exchange({ tone = 'night', className = '' }) {
  const night = tone === 'night';
  const quiet = night ? 'text-nightmuted' : 'text-muted';
  const hair = night ? 'border-nightline' : 'border-border';
  const said = night ? 'text-paper' : 'text-ink';
  const asked = night ? 'text-paper/80' : 'text-ink/80';

  return (
    <Card variant="raised" tone={tone} pad="none" className={`p-6 sm:p-8 ${className}`}>
      <div className={`divide-y ${night ? 'divide-nightline' : 'divide-border'}`}>
        {TURNS.map((t, i) => {
          const isCompanion = t.who === 'Kaizen';
          return (
            <div
              key={i}
              className="grid gap-x-6 gap-y-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[5.5rem_1fr]"
            >
              <p className={`text-xs font-medium ${isCompanion ? (night ? 'text-ember' : 'text-accent') : quiet}`}>
                {t.who}
              </p>
              <p className={`text-t3 ${isCompanion ? said : asked}`}>{t.text}</p>
            </div>
          );
        })}
      </div>
      <p className={`mt-6 border-t pt-4 text-sm ${hair} ${quiet}`}>
        Four turns, and <span className="font-opmono">x = 7</span> goes unsaid. On purpose.
      </p>
    </Card>
  );
}
