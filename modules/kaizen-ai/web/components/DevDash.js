'use client';

import { useState, useEffect, useRef } from 'react';
import { getEvents, subscribe, clearEvents, ENGINE_STAGES } from '@/lib/devlog';
import { IconX } from '@/components/Icons';

// The "Prius 2nd-gen info dash" — a development-only overlay that shows
// where information flows and how each engine processes it, live.
// Toggle with the ⚙ button or press "d" three times fast.
//
// It used to be a GitHub-dark console pasted into a light product: eleven raw
// hex values and a dark surface, in a system where the only dark surface is
// /ai. It is now paper like everything else, on the tokens, with the record
// font doing the work a terminal palette used to do. Dev-only, so it stays
// plain: no elevation games, no motion beyond the one firing pulse.

function timeAgo(iso) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

export default function DevDash({ open, onClose }) {
  const [events, setEvents] = useState([]);
  const [pulse, setPulse] = useState(null); // stage id that just fired
  const logRef = useRef(null);

  useEffect(() => {
    setEvents(getEvents());
    return subscribe((event, all) => {
      setEvents(all);
      if (event) {
        setPulse(event.stage);
        setTimeout(() => setPulse(null), 1200);
      }
    });
  }, []);

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, events]);

  if (!open) return null;

  const lastByStage = {};
  for (const e of events) lastByStage[e.stage] = e;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl max-h-[92vh] bg-panel text-ink rounded-t-lg sm:rounded-lg overflow-hidden flex flex-col border border-border shadow-lift"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="k-label text-accent">Engine Room</div>
            <div className="text-xs text-muted mt-0.5">Development view: how data flows through Kaizen</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearEvents(); }}
              className="font-opmono text-micro uppercase text-muted hover:text-ink border border-border rounded-sm px-2.5 py-1.5 transition-colors"
            >
              clear
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-muted hover:text-ink w-8 h-8 rounded-sm border border-border flex items-center justify-center transition-colors"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pipeline */}
          <div className="p-5 border-b border-border">
            <div className="k-label mb-3">Pipeline</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ENGINE_STAGES.map((stage, i) => {
                const last = lastByStage[stage.id];
                const firing = pulse === stage.id;
                return (
                  <div
                    key={stage.id}
                    className={`rounded-sm border p-3 transition-all duration-300 ${
                      firing
                        ? 'border-accent bg-accent/10'
                        : last
                          ? 'border-border bg-panel2'
                          : 'border-border/60 bg-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${firing ? 'bg-accent animate-pulse' : last ? 'bg-good' : 'bg-border'}`} />
                      <span className="font-opmono text-micro text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="text-sm font-semibold text-ink leading-tight">{stage.label}</div>
                    <div className="text-xs text-muted mt-1 leading-snug">{stage.desc}</div>
                    {last && (
                      <div className="font-opmono text-micro text-accent mt-1.5 truncate">{timeAgo(last.at)} · {last.label.slice(0, 30)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model routing card */}
          <div className="p-5 border-b border-border">
            <div className="k-label mb-3">Model routing</div>
            <div className="space-y-1.5 font-opmono text-xs">
              <div className="flex justify-between gap-4"><span className="text-muted">tutor generation</span><span className="text-good">claude-sonnet-5</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">understanding grade</span><span className="text-good">claude-sonnet-5</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">syllabus / intake parse</span><span className="text-good">claude-sonnet-5</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">voice (STT + TTS)</span><span className="text-good">openai (whisper + tts)</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">spaced repetition</span><span className="text-warn">SM-2 (local, no LLM)</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">persistence</span><span className="text-accent">localStorage + Supabase sync</span></div>
            </div>
          </div>

          {/* Live log */}
          <div className="p-5">
            <div className="k-label mb-3">
              Event log · {events.length}
            </div>
            <div ref={logRef} className="space-y-1 max-h-64 overflow-y-auto font-opmono text-xs">
              {events.length === 0 && (
                <div className="text-muted">No events yet. Use the app (chat, grade, complete homework) and watch them stream in.</div>
              )}
              {events.slice(-60).map((e, i) => (
                <div key={i} className="flex gap-2 items-baseline">
                  <span className="text-muted shrink-0 w-14 tabular-nums">{new Date(e.at).toLocaleTimeString('en-US', { hour12: false })}</span>
                  <span className="text-accent shrink-0 w-20 truncate">[{e.stage}]</span>
                  <span className="text-ink">{e.label}</span>
                  {e.detail && <span className="text-muted truncate">· {e.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
