'use client';

// /admin/funnel — the founder's board. One screen, read weekly, that answers
// one question: where is the funnel leaking?
//
// It is arranged as three questions rather than one list, because they are
// three questions and mixing them is how a board stops being read:
//
//   what needs doing   the families paying with no room, by name
//   the funnel         the three stage-to-stage rates, then the counts
//   delivery           whether the rooms happened and what came out of them
//   money              what is billed, what the Director costs
//
// This page does NO arithmetic. It renders `conversion`, `rows`, `gap` and
// `money` exactly as /api/admin/funnel computed them, including the formatted
// figures, because a number a parent or an investor is shown must not be a
// number a browser made up. If a figure looks wrong, the fix is in the route,
// not here — and that is the point. The only branching below is on `status`,
// which decides the tone of a row:
//
//   ok               a real number
//   no_data          the query ran and found nothing yet
//   not_provisioned  the table does not exist in this database yet
//   error            the read failed and the row says so instead of guessing
//
// It lives at its own route rather than inside the 1,100-line /admin page on
// purpose: the console is a merge battleground and this board is read, not
// operated.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { authedFetch } from '@/lib/supabaseClient';
import { IconRefresh } from '@/components/Icons';
import AppHeader from '@/components/ui/AppHeader';
import Section from '@/components/ui/Section';
import Card from '@/components/ui/Card';
import Notice from '@/components/ui/Notice';
import Stat from '@/components/ui/Stat';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const WINDOWS = [30, 90];

// Tone per row status. A row that cannot answer must never look like a row
// answering zero: 'no_data' is quiet, 'not_provisioned' is a build state, and
// a failed read is loud.
const STATUS_TONE = {
  ok: 'bg-panel2 text-muted',
  no_data: 'bg-panel2 text-muted',
  not_provisioned: 'bg-warn/15 text-ink',
  error: 'bg-bad/15 text-ink',
};
const STATUS_WORD = {
  ok: 'measured',
  no_data: 'nothing yet',
  not_provisioned: 'not built yet',
  error: 'could not read',
};

export default function FunnelBoard() {
  const [days, setDays] = useState(30);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [authed, setAuthed] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authedFetch(`/api/admin/funnel?days=${days}`);
      if (res.status === 401) { setAuthed(false); return; }
      setAuthed(true);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setBoard(null); setError(body.error || 'Could not load the board.'); return; }
      setBoard(body);
    } catch (e) {
      setError(e.message || 'Could not load the board.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (authed === false) {
    return (
      <Shell>
        <Card pad="lg" className="text-center max-w-narrow mx-auto mt-10">
          <p className="font-brand font-semibold text-t2">Sign in required</p>
          <p className="text-sm text-muted mt-2">
            Sign in on the <Link href="/dashboard" className="text-accent underline underline-offset-2">dashboard</Link> with
            an admin account, then return here.
          </p>
        </Card>
      </Shell>
    );
  }

  const unbuilt = (board?.rows || []).filter((r) => r.status === 'not_provisioned');
  const broken = (board?.rows || []).filter((r) => r.status === 'error');
  const groups = board?.groups || [];

  return (
    <Shell>
      {/* One control row above everything it scopes. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-brand font-semibold text-d3">Funnel</h1>
          <p className="text-sm text-muted mt-1.5">
            Interest → diagnostic → seat → retained, then what the seat pays for. Every figure is computed
            on the server; this page only prints them.
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {WINDOWS.map((d) => (
            <Chip key={d} selected={days === d} onClick={() => setDays(d)}>{d} days</Chip>
          ))}
          <Chip onClick={load}><IconRefresh size={13} /> Refresh</Chip>
        </div>
      </div>

      {error && <Notice kind="bad" className="mt-5">{error}</Notice>}
      {/* The notice names the window being FETCHED, not the one on screen. It
          used to be gated on `!board`, so switching to 90 days changed nothing
          at all until the fetch returned and the reader had no idea the click
          had registered. The board beneath holds its last render at reduced
          opacity rather than flashing a skeleton. */}
      {loading && <Notice kind="info" className="mt-5">Computing the last {days} days…</Notice>}

      {board && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
          {unbuilt.length > 0 && (
            <Notice kind="warn" className="mt-5">
              {unbuilt.length === 1
                ? 'One row on this board has no table behind it yet: '
                : `${unbuilt.length} rows on this board have no table behind them yet: `}
              {unbuilt.map((r) => r.label).join(', ')}. Those rows show a dash rather than a zero — nothing
              has been recorded because nothing can be.
            </Notice>
          )}
          {broken.length > 0 && (
            <Notice kind="bad" className="mt-3">
              Could not read: {broken.map((r) => r.label).join(', ')}. Everything else on this board is live.
            </Notice>
          )}

          {/* What needs doing, first. It is the one part of this page that is a
              list of people rather than a measurement, and it costs money the
              day it is wrong: a family paying the seat price with no room to
              sit in. Every block below is guarded on its own key — a partial
              payload must render the parts that arrived, never a blank page. */}
          {board.gap && <GapCard gap={board.gap} />}

          {groups.map((g) => {
            const rows = (board.rows || []).filter((r) => (r.group || 'funnel') === g.key);
            const leads = g.key === 'funnel' && board.conversion;
            if (rows.length === 0 && !leads) return null;
            return (
              <section className="mt-8" key={g.key}>
                <SectionHead
                  title={leads ? `${g.title} · last ${board.windowDays} days` : g.title}
                  blurb={g.blurb}
                />
                {leads && <ConversionCard conversion={board.conversion} />}
                {rows.length > 0 && <RowsCard rows={rows} />}
              </section>
            );
          })}

          {/* A row whose group the server did not name still gets printed. The
              board's own rule is that a row never silently disappears — it says
              why it cannot answer — and that has to survive a group being
              renamed on one side of the wire and not the other. */}
          {orphans(board, groups).length > 0 && (
            <section className="mt-8">
              <SectionHead title="Everything else" />
              <RowsCard rows={orphans(board, groups)} />
            </section>
          )}

          {board.money && (
            <section className="mt-8">
              <SectionHead
                title="Money"
                blurb="What the paying plans bill, against the Program Director cost the staffing dial implies."
              />
              <Card pad="md">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Stat value={board.money.mrrDisplay} label={`Seat MRR · ${board.money.seatLabel}`} />
                  <Stat value={board.money.directorDisplay} label={`Program Director · ${board.money.hoursPerWeek} hrs/week`} />
                  <Stat value={board.money.contributionDisplay} label="Left after the Director" />
                  <Stat value={board.money.seatsCoveringDirector} label="Seats that cover the Director" />
                </div>
                <p className="text-sm text-muted mt-4">
                  {board.money.coverageNote}
                </p>
                <p className="text-sm text-muted mt-2">
                  {board.money.basisNote} The seat price and the director’s rate both come from the pricing
                  module, never from this page.
                </p>
              </Card>
            </section>
          )}

          {board.period && (
            <p className="text-xs text-muted mt-6">
              Current period {fmtDay(board.period.currentFrom)} → {fmtDay(board.period.currentTo)}; compared
              against {fmtDay(board.period.previousFrom)} → {fmtDay(board.period.previousTo)}.
            </p>
          )}
        </div>
      )}
    </Shell>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader width="wide" />
      <Section as="main" width="wide" space="tight">{children}</Section>
    </div>
  );
}

// A figure the board asserts. Mono with tabular numerals, the same treatment
// the operations console gives every record value, so a changing number does
// not reflow the line beside it.
function Num({ className = '', children }) {
  return <span className={`font-opmono tabular-nums ${className}`}>{children}</span>;
}

function SectionHead({ title, blurb }) {
  return (
    <div className="mb-2 px-1">
      <h2 className="k-label">{title}</h2>
      {blurb && <p className="text-xs text-muted mt-1">{blurb}</p>}
    </div>
  );
}

function Chip({ selected = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold '
        + 'transition-colors '
        + (selected ? 'bg-accent text-paper hover:bg-accent/90' : 'bg-panel2 text-ink border border-border hover:border-ink/25')}
    >
      {children}
    </button>
  );
}

// One stage-to-stage rate. The denominator is printed under every one of them,
// in words, because a percentage whose denominator is invisible is the way a
// board lies — and with no customers the honest render is a dash and a
// sentence, never 0%.
//
// The bar is decoration: every value it encodes is already in the text above
// it, so it is hidden from assistive technology rather than described twice.
// It is drawn only when a rate exists; an empty track would read as zero.
function Step({ step }) {
  return (
    <div>
      <p className="k-label">{step.label}</p>
      <p className="font-opmono text-t1 tabular-nums mt-1.5">{step.display}</p>
      {step.barPct != null && (
        <div className="h-1 rounded-full bg-panel2 mt-2 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full bg-accent" style={{ width: `${step.barPct}%` }} />
        </div>
      )}
      {step.basis && <p className="text-xs text-muted mt-2"><Num>{step.basis}</Num></p>}
      {step.status !== 'ok' && step.status !== 'no_data' && (
        <span className={`k-badge mt-2 ${STATUS_TONE[step.status] || STATUS_TONE.ok}`}>
          {STATUS_WORD[step.status] || step.status}
        </span>
      )}
      {step.note && <p className="text-xs text-muted mt-1.5 italic">{step.note}</p>}
      {step.shape && step.status === 'ok' && <p className="text-xs text-muted mt-1.5 italic">{step.shape}</p>}
    </div>
  );
}

// Rows the server put in a group the server did not describe.
function orphans(board, groups) {
  const known = new Set((groups || []).map((g) => g.key));
  return (board?.rows || []).filter((r) => !known.has(r.group || 'funnel'));
}

function ConversionCard({ conversion }) {
  return (
    <Card pad="md">
      <div className="grid gap-6 sm:grid-cols-3">
        {(conversion.steps || []).map((step) => <Step key={step.key} step={step} />)}
      </div>
      {conversion.allEmpty && (
        <p className="text-xs text-muted mt-5 pt-4 border-t border-border">{conversion.emptyNote}</p>
      )}
    </Card>
  );
}

function RowsCard({ rows }) {
  return (
    <Card pad="none" className="overflow-hidden mt-3">
      <div className="divide-y divide-border">
        {rows.map((row) => <Row key={row.key} row={row} />)}
        {rows.length === 0 && (
          <EmptyState title="Nothing to show yet">
            The server sent no rows for this part of the board.
          </EmptyState>
        )}
      </div>
    </Card>
  );
}

function Row({ row }) {
  return (
    <div className="px-5 py-4 flex flex-wrap items-start gap-x-5 gap-y-2">
      <div className="w-28 shrink-0">
        <p className="font-opmono tabular-nums text-t2">{row.display}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{row.label}</span>
          {/* A measured row wears no badge: the figure IS the badge. Only the
              rows that cannot answer need labelling, and they need it loudly. */}
          {row.status !== 'ok' && (
            <span className={`k-badge shrink-0 ${STATUS_TONE[row.status] || STATUS_TONE.ok}`}>
              {STATUS_WORD[row.status] || row.status}
            </span>
          )}
          {row.trend && <span className="text-xs text-muted"><Num>{row.trend}</Num></span>}
        </div>
        {(row.detail || []).map((line, i) => (
          // Index-keyed because two detail lines can legitimately read the same
          // (two rooms, both "0 held places"), and a duplicate key drops one.
          <p key={`${row.key}-${i}`} className="text-xs text-muted mt-1"><Num>{line}</Num></p>
        ))}
        {row.note && <p className="text-xs text-muted mt-1.5 italic">{row.note}</p>}
      </div>
      <p className="font-opmono text-xs text-muted shrink-0 self-center">{row.source}</p>
    </div>
  );
}

// The one card on this page that is a list of people. An integer cannot be
// enrolled, so when there is work to do it names the families and links to the
// panel that does the work.
function GapCard({ gap }) {
  const needsPlacing = gap.payingButUnplaced > 0;
  const freeRooms = gap.placedButNotPaying > 0;
  return (
    <section className="mt-7">
      <SectionHead
        title="Who needs a room"
        blurb="The one failure that costs a customer and a refund at once."
      />
      <Card pad="md" className={needsPlacing ? 'border-bad/40' : ''}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat value={gap.payingButUnplaced} label="Paying, not placed in a room" />
          <Stat value={gap.paying} label="Committed seats (paying)" />
          <Stat value={gap.payingAndPlaced} label="Paying and placed" />
          <Stat value={gap.placedButNotPaying} label="Placed with no seat plan" />
        </div>

        {needsPlacing && (
          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-sm text-ink">{gap.headline}. {gap.action}</p>
            <FamilyList families={gap.unplaced} overflow={gap.unplacedOverflow} />
            <div className="mt-4">
              <Button href={gap.consoleHref} variant="secondary" size="sm">{gap.consoleLabel}</Button>
            </div>
          </div>
        )}

        {freeRooms && (
          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-sm text-ink">{gap.freeAction}</p>
            <FamilyList families={gap.freeDelivery} overflow={gap.freeDeliveryOverflow} />
          </div>
        )}

        {!needsPlacing && !freeRooms && <p className="text-sm text-muted mt-4">{gap.settled}</p>}
      </Card>
    </section>
  );
}

function FamilyList({ families, overflow }) {
  if (!families || families.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1">
      {families.map((f) => (
        <li key={f.id} className="text-sm">
          <span className="font-medium">{f.label}</span>
          {f.email && <> <Num className="text-xs text-muted">{f.email}</Num></>}
        </li>
      ))}
      {overflow > 0 && (
        <li className="text-xs text-muted">…and <Num>{overflow}</Num> more.</li>
      )}
    </ul>
  );
}

// Dates on this page are context, not record values: a short local date is
// enough to know which fortnight is being compared, and a full ISO string in
// four places would drown the figures it frames.
function fmtDay(iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString() : '—';
}
