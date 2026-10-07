// Reference reconstruction entry.
// REAL components imported from the read-only snapshot (web/): TodayView and
// everything it pulls in (ui/Button, ui/Card, ui/Eyebrow, Rings, TaskModal,
// Brand, Icons, lib/appState, lib/courses, lib/mastery), plus ui/AppFooter.
// EXTRACTED (static copy, hand-adapted): the dashboard shell JSX from
// app/dashboard/page.js:600-712 and TABS from page.js:39-43. The real page
// component is wrapped in auth/sync/intake hooks that need Supabase, so the
// shell markup is copied here with those hooks replaced by fixture state.
// Nothing else is invented. Fixtures are fictional (see fixtures.js).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TodayView from '@/components/TodayView';
import AppFooter from '@/components/ui/AppFooter';
import { KaizenLogo } from '@/components/Brand';
import { IconSun, IconCalendar, IconBook, IconGrades, IconSprout } from '@/components/Icons';
import { FIXTURE_APP, FIXTURE_CONCEPTS, FIXTURE_ENGINE_SUMMARY } from './fixtures';

// page.js:39-43, verbatim.
const TABS = [
  { id: 'today',    label: 'Today',  Icon: IconSun },
  { id: 'calendar', label: 'Plan',   Icon: IconCalendar },
  { id: 'study',    label: 'Learn',  Icon: IconBook },
  { id: 'grades',   label: 'Grades', Icon: IconGrades },
  { id: 'progress', label: 'Growth', Icon: IconSprout },
];

const NOT_BUILT = {
  calendar: 'components/CalendarView.js',
  study: 'components/StudyView.js (+ StudySession.js)',
  grades: 'components/GradesView.js',
  progress: 'components/ProgressView.js',
};

function NotReconstructed({ id }) {
  return (
    <div className="k-card p-6 animate-fadeUp">
      <p className="k-label">Not reconstructed</p>
      <p className="mt-2 text-sm text-muted">
        This reference reproduces the shell and Today only. The original renders {NOT_BUILT[id]} here.
      </p>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState('today');
  const [app, setApp] = useState(FIXTURE_APP);
  const [note, setNote] = useState('');
  const engineSummary = FIXTURE_ENGINE_SUMMARY;
  const syncError = '';
  const say = (s) => { setNote(s); window.clearTimeout(say.t); say.t = window.setTimeout(() => setNote(''), 2600); };

  const view = tab === 'today' ? (
    <TodayView
      app={app}
      concepts={FIXTURE_CONCEPTS}
      onCompleteAssignment={(id) => setApp((s) => ({ ...s, assignments: s.assignments.map((a) => a.id === id ? { ...a, status: 'done', completedAt: new Date().toISOString() } : a) }))}
      onDeleteAssignment={(id) => setApp((s) => ({ ...s, assignments: s.assignments.filter((a) => a.id !== id) }))}
      onAddTask={(t) => setApp((s) => ({ ...s, assignments: [...s.assignments, { id: 'a' + Date.now(), status: 'todo', minutes: 15, ...t }] }))}
      onStudyAssignment={(a) => say(`Original opens StudySession for “${a.title}” (not reconstructed)`)}
      onCurious={(topic) => say(`Original opens a curiosity session: “${topic}” (not reconstructed)`)}
      onOpenIntake={() => say('Original opens the IntakeBox sheet (not reconstructed)')}
    />
  ) : <NotReconstructed id={tab} />;

  // ── Shell: extracted from app/dashboard/page.js:600-712 ───────────────────
  return (
    <div className="min-h-screen bg-paper">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-panel2 border-r border-border z-20">
        <div className="px-5 pt-6 pb-5">
          <KaizenLogo size={32} href="#" caption="small steps, every day" />
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}
                className={`group relative w-full flex items-center gap-3 rounded-sm pl-4 pr-3 py-2.5 text-sm font-medium transition-colors ${
                  on ? 'bg-panel text-ink shadow-soft' : 'text-muted hover:bg-panel/70 hover:text-ink'}`}>
                <span aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full ${on ? 'bg-accent' : 'bg-transparent'}`} />
                <t.Icon size={18} className={on ? 'text-accent' : 'text-muted group-hover:text-ink'} />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pt-3 pb-4 border-t border-border space-y-3">
          {engineSummary && engineSummary.total > 0 && (
            <div className="rounded-sm bg-panel border border-border px-3 py-2.5">
              <p className="k-label">Confirmed</p>
              <p className="mt-1 font-opmono text-t3 font-semibold tabular-nums text-ink">
                {engineSummary.confirmed}
                <span className="font-normal text-muted"> of {engineSummary.total}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted">on your own, unaided</p>
            </div>
          )}
          <div className="px-1 space-y-2.5">
            <div className="flex items-center gap-2 text-xs">
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${syncError ? 'bg-bad' : 'bg-good'}`} />
              <span className="truncate font-medium text-ink">{app.profile.name}</span>
              {syncError ? <span className="shrink-0 text-bad">not saved</span> : <span className="shrink-0 text-muted">synced</span>}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <a href="#" className="text-muted hover:text-accent transition-colors">Billing</a>
              <a href="#" className="text-muted hover:text-accent transition-colors">Settings</a>
              <a href="#" className="text-muted hover:text-accent transition-colors">Family</a>
            </div>
            <button onClick={() => say('Original signs out here (no-op in reference)')} className="text-xs text-muted hover:text-bad transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:pl-60">
        {/* Reference-only disclosure strip, in flow (adds ~28px above the original content). Not part of the original UI. */}
        <div data-reference-strip className="border-b border-border bg-panel2 px-4 lg:px-8 py-1.5 text-micro font-opmono uppercase text-muted">
          Local reconstruction · fictional fixtures · not production
          {note && <span className="normal-case tracking-normal text-ink"> — {note}</span>}
        </div>
        <div className="max-w-lg lg:max-w-4xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8">{view}</div>
        <AppFooter className="mt-12 pb-20 lg:pb-0" />
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-panel/90 backdrop-blur-xl border-t border-border z-20">
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}
                className="relative py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-1">
                <span aria-hidden="true" className={`absolute top-0 inset-x-6 h-0.5 rounded-full ${on ? 'bg-accent' : 'bg-transparent'}`} />
                <t.Icon size={21} strokeWidth={on ? 2.1 : 1.8} className={`transition-colors ${on ? 'text-accent' : 'text-muted/60'}`} />
                <span className={`text-micro font-medium ${on ? 'text-accent' : 'text-muted'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* ── end extracted shell ── */}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Shell />);
