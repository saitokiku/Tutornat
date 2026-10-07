'use client';

// 1:1 tutor video call — embeds the Daily prebuilt UI (camera, mic, screen
// share, chat) in a modal. The room + scoped token come from
// /api/tutoring/room; the Daily API key never reaches the client.
//
// Restyled onto the one system (spec: 2026-08-22-one-system-rebuild.md). The
// chrome around the call is now paper like the rest of the interior: it used
// to be a coal bar with white-alpha controls, which meant the Hall board rail
// beside it (already light) read as a different product. Nothing about the
// call itself moved. The report-a-concern control is still in the bar of every
// session, because both /terms and the safety page promise it is.

import { useEffect, useRef, useState } from 'react';
import { authedFetch } from '@/lib/supabaseClient';
import { IconX } from '@/components/Icons';
import Button from '@/components/ui/Button';

// `group` switches the room endpoint to the group counterpart — same contract
// ({roomUrl, token}), different authorization (a settled seat instead of the
// session's student).
// `headerExtra` renders extra controls in the top bar (e.g. the Homework Hall
// help flag) without VideoCall knowing anything about seats.
// `sidePanel` (ReactNode) renders a right rail beside the video on large
// screens and a "Room board" bottom sheet below lg — the Hall vote board
// lives there without VideoCall knowing what it is.
export default function VideoCall({ sessionId, title, onClose, group = false, headerExtra = null, sidePanel = null }) {
  const wrapRef = useRef(null);
  const frameRef = useRef(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Opening the room…');
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportMsg, setReportMsg] = useState('');
  const [boardOpen, setBoardOpen] = useState(false);

  async function submitReport() {
    if (reportText.trim().length < 5) { setReportMsg('Tell us what happened (a sentence is enough).'); return; }
    setReportMsg('Sending…');
    const res = await authedFetch('/api/safety/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'tutor_conduct', sessionId, detail: reportText.trim() }),
    });
    if (res.ok) { setReportMsg('Reported. Our team is alerted immediately. You can leave the session any time.'); setReportText(''); }
    else setReportMsg('Could not send. Email hello@kaizenedu.net right away.');
  }

  useEffect(() => {
    let cancelled = false;
    let frame = null;

    (async () => {
      try {
        const res = await authedFetch(group ? '/api/tutoring/group/room' : '/api/tutoring/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not open the room.');
        if (cancelled) return;

        const DailyIframe = (await import('@daily-co/daily-js')).default;
        if (cancelled || !wrapRef.current) return;
        frame = DailyIframe.createFrame(wrapRef.current, {
          showLeaveButton: true,
          iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '0' },
        });
        frameRef.current = frame;
        frame.on('left-meeting', () => onClose?.());
        setStatus('');
        await frame.join({ url: data.roomUrl, token: data.token });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Video failed to start.');
      }
    })();

    return () => {
      cancelled = true;
      try { frame?.destroy(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel px-4">
        <span className="truncate text-sm font-semibold text-ink">{title || 'Tutoring session'}</span>
        {headerExtra}
        {sidePanel && (
          <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => setBoardOpen((v) => !v)}>
            Room board
          </Button>
        )}
        {/* Promised by /terms and the safety page: present in every session. */}
        <button type="button" onClick={() => { setReporting((r) => !r); setReportMsg(''); }}
          className="ml-auto text-xs font-semibold text-bad underline-offset-4 hover:underline">
          Report a concern
        </button>
        <Button size="sm" variant="secondary" onClick={onClose}>Leave</Button>
      </div>

      {reporting && (
        <div className="shrink-0 space-y-2 border-b border-border bg-panel2 px-4 py-3">
          <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={2}
            placeholder="What happened? This goes straight to the Kaizen safety team."
            className="k-input resize-none px-3 py-2 text-sm" />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={submitReport}>Send report</Button>
            <span className="text-xs text-muted">{reportMsg}</span>
          </div>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        <div ref={wrapRef} className="relative flex-1 bg-panel2">
          {status && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">{status}</div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <div className="max-w-sm">
                <p className="text-sm text-ink">{error}</p>
                <div className="mt-4 flex justify-center">
                  <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {sidePanel && (
          <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-border bg-paper lg:flex lg:flex-col">
            {sidePanel}
          </aside>
        )}

        {sidePanel && boardOpen && (
          <div className="absolute inset-0 z-10 flex flex-col justify-end lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setBoardOpen(false)} />
            <div className="relative max-h-[60vh] overflow-y-auto rounded-t-md border-t border-border bg-paper">
              <div className="sticky top-0 flex justify-end bg-paper/95 px-2 pt-2 backdrop-blur">
                <button type="button" onClick={() => setBoardOpen(false)} aria-label="Close board"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-panel2 text-muted transition-colors hover:text-ink">
                  <IconX size={13} />
                </button>
              </div>
              {sidePanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
