'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { masteryPercent, statusOf } from '@/lib/mastery';
import { logEvent } from '@/lib/devlog';
import { loadChat, saveChat, clearChat } from '@/lib/chatMemory';
import { limitedFetch } from '@/lib/limits';
import { capture } from '@/lib/analytics';
import { useVoiceChat } from '@/lib/useVoiceChat';
import { KaizenMark } from '@/components/Brand';
import {
  IconArrowUp, IconPlus, IconMic, IconCheck,
  IconChevronLeft, IconSpark, IconRefresh,
} from '@/components/Icons';

// Rich renderer (react-markdown + KaTeX + code + graphs + mermaid) is lazy —
// its math/diagram libraries load only when a study session actually opens.
const MessageBody = dynamic(() => import('@/components/MessageBody'), {
  ssr: false,
  loading: () => <span className="opacity-40">…</span>,
});

const TEXT = { good: 'text-good', warn: 'text-warn', bad: 'text-bad' };
const QUALITY_LABEL = ['No recall', 'Barely', 'With effort', 'Correct', 'Strong', 'Perfect'];

// One-tap learning moves — the difference between a chatbot and a tutor.
const QUICK_ACTIONS = [
  { label: 'Explain it simpler', text: 'Can you explain that more simply?' },
  { label: 'Show an example', text: 'Can you show me a concrete example?' },
  { label: 'Quiz me', text: 'Quiz me on this.' },
  { label: 'Why does this matter?', text: 'Why does this actually matter?' },
];
const CURIOUS_ACTIONS = [
  { label: 'Go deeper', text: 'Go deeper on that.' },
  { label: 'Connect it to real life', text: 'How does this connect to everyday life?' },
  { label: 'Another surprise', text: 'Give me another surprising angle on this.' },
];

export default function StudySession({
  concept,
  assignment,
  mode = 'study',          // 'study' | 'curious'
  documents = [],
  studentName = '',
  learningStyle = '',
  onGraded,
  onAdopt,                 // curious mode: add topic to my concepts
  onBack,
}) {
  const isCurious = mode === 'curious';
  const [messages, setMessages] = useState([]);
  const [restored, setRestored] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [adopted, setAdopted] = useState(false);
  // Teaching style for study mode. Default 'teach' (self-contained micro-lessons)
  // so a student's limited daily messages each deliver real learning; 'socratic'
  // is the question-first classic for when they'd rather be drawn out.
  const [teachStyle, setTeachStyle] = useState('teach');
  // Voice loop lives in its own hook (audit MAINT-001) — OpenAI only, no
  // browser speech APIs. Transcripts route straight into send().
  const { voiceOn, listening, transcribing, speaking, voiceError, setVoiceError, toggleVoice, speak, voiceOnRef } =
    useVoiceChat({ onTranscript: (text) => sendRef.current(text) });

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const pct = masteryPercent(concept);
  const status = statusOf(pct);
  const isNew = concept.lastQuality === null;

  // ── Chat memory ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCurious) { setRestored(true); return; }
    const saved = loadChat(concept.name);
    if (saved.length > 0) {
      setMessages(saved);
      logEvent('store', 'Chat memory restored', `${saved.length} messages · ${concept.name}`);
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept.name]);

  useEffect(() => {
    // Never persist transient error bubbles into memory (they'd be replayed).
    if (!isCurious && restored && messages.length > 0) saveChat(concept.name, messages.filter((m) => !m.error));
  }, [messages, restored, concept.name, isCurious]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { if (!voiceOn) inputRef.current?.focus(); }, [voiceOn]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendRef = useRef(() => {});
  async function send(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    setGradeResult(null);

    logEvent('input', 'Student message', text.slice(0, 60));
    if (!isCurious) {
      logEvent('context', 'Loading concept state', `${concept.name} · mastery ${pct}%`);
      if (documents.length) logEvent('context', 'Attaching documents', documents.map(d => d.name).join(', '));
      logEvent('strategy', 'Socratic strategy selected', 'lead with questions, smallest unblocking hint');
    } else {
      logEvent('strategy', 'Curiosity mode', 'hook-first storytelling, forks');
    }

    // Drop any prior error bubbles: they must never be replayed to the model as
    // real conversation, and retrying should clear them from view.
    const next = [...messages.filter((m) => !m.error), { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      logEvent('llm', 'Streaming from claude-sonnet-5', `${next.length} messages in context`);
      const res = await limitedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          concept: concept.name,
          mode: isCurious ? 'curious' : (teachStyle === 'teach' ? 'lesson' : 'socratic'),
          documents: documents.map(d => ({ name: d.name, text: d.text })),
          studentName,
          learningStyle,
          voice: voiceOnRef.current,
          // Let the tutor pitch to the student's real level (audit: mastery was
          // invisible to the model). Server sanitizes before trusting it.
          mastery: isCurious ? null : { pct, status, lastQuality: concept.lastQuality ?? null, seen: concept.lastQuality !== null },
        }),
      });
      if (!res.ok || !res.body) throw new Error('Request failed (' + res.status + ')');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      // Throttle re-renders to ~50ms so KaTeX/markdown don't re-parse every
      // token during the stream (rich rendering is heavier than plain text).
      let lastFlush = 0, timer = null;
      const paint = () => {
        lastFlush = Date.now(); timer = null;
        setMessages(prev => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: 'assistant', content: acc };
          return copy;
        });
      };
      const schedule = () => {
        const dt = Date.now() - lastFlush;
        if (dt >= 50) paint();
        else if (!timer) timer = setTimeout(paint, 50 - dt);
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        schedule();
      }
      if (timer) clearTimeout(timer);
      paint(); // final, complete content
      logEvent('llm', 'Stream complete', `${acc.length} chars`);
      capture('tutor_message', { mode: isCurious ? 'curious' : (teachStyle === 'teach' ? 'lesson' : 'socratic') });
      if (voiceOnRef.current) speak(acc);
    } catch (err) {
      logEvent('llm', 'Tutor request failed', err.message);
      const friendly = 'Sorry, I lost my train of thought for a second. Could you send that again?';
      setMessages(prev => {
        const copy = prev.slice();
        // Tag as an error so it isn't saved to memory or replayed as context.
        copy[copy.length - 1] = { role: 'assistant', content: friendly, error: true };
        return copy;
      });
      // In a hands-free voice session, speak the apology — speak() re-arms the
      // mic in its onDone, so one flaky request no longer silently kills voice.
      if (voiceOnRef.current) speak(friendly);
    } finally {
      setStreaming(false);
      if (!voiceOnRef.current) setTimeout(() => inputRef.current?.focus(), 50);
    }
  }
  sendRef.current = send;

  // ── Grade ──────────────────────────────────────────────────────────────────
  async function gradeSession() {
    if (grading || messages.length === 0) return;
    setGrading(true);
    setGradeResult(null);
    try {
      const transcript = messages
        .map(m => (m.role === 'user' ? 'Student: ' : 'Tutor: ') + m.content)
        .join('\n');
      logEvent('grade', 'Grading transcript', `${transcript.length} chars → 0-5 SuperMemo scale`);
      const res = await limitedFetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: concept.name, transcript }),
      });
      const data = await res.json();
      setGradeResult(data);
      logEvent('grade', `Scored ${data.quality}/5`, data.rationale?.slice(0, 80));
      capture('grade', { quality: data.quality });
      logEvent('sm2', 'Updating spaced-repetition state', `quality=${data.quality}`);
      onGraded(concept.id, data.quality);
      logEvent('store', 'Mastery persisted', concept.name);
    } catch (err) {
      setGradeResult({ quality: 0, rationale: 'Grading failed: ' + err.message });
    } finally {
      setGrading(false);
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    logEvent('input', 'File attached in chat', `${file.name} (${Math.round(file.size / 1024)}KB)`);
    send(`I just uploaded my assignment file "${file.name}". Help me work through it. Quiz me on the key ideas it covers about ${concept.name}.`);
    e.target.value = '';
  }

  function startFresh() {
    if (!isCurious) clearChat(concept.name);
    setMessages([]);
    setGradeResult(null);
    logEvent('store', 'Chat memory cleared', concept.name);
  }

  const qualityColor =
    gradeResult?.quality >= 4 ? 'text-good' :
    gradeResult?.quality >= 2 ? 'text-warn' : 'text-bad';

  const hasDocs = documents.length > 0;

  return (
    <div className="flex flex-col h-screen bg-paper text-ink">

      {/* Header */}
      <header className="border-b border-border px-4 py-3 shrink-0 bg-panel/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 shrink-0 text-sm font-medium text-ink hover:text-accent transition-colors"
          >
            <IconChevronLeft size={16} />
            Back
          </button>
          <div className="flex-1 min-w-0 text-center">
            <div className="flex items-center justify-center gap-1.5 min-w-0">
              {isCurious ? <IconSpark size={14} className="text-accent shrink-0" /> : null}
              <span className="text-body font-semibold text-ink truncate">{concept.name}</span>
            </div>
            {assignment ? (
              <div className="text-xs text-muted truncate">{assignment.title}</div>
            ) : isCurious ? (
              <div className="text-xs text-muted">Curiosity dive · no grades, just wonder</div>
            ) : !isNew ? (
              <div className={`text-xs font-medium ${TEXT[status]}`}>
                <span className="font-opmono tabular-nums">{pct}%</span> mastery
              </div>
            ) : (
              <div className="text-xs text-muted">First session</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleVoice}
              title={voiceOn ? 'End voice conversation' : 'Voice conversation'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                voiceOn ? 'bg-bad text-paper' : 'bg-panel2 text-muted hover:text-accent'
              }`}
            >
              {voiceOn ? <span className="w-2.5 h-2.5 bg-paper" /> : <IconMic size={17} />}
            </button>
            {!isCurious && messages.length >= 2 && !gradeResult && (
              <button
                onClick={gradeSession}
                disabled={grading || streaming}
                className="k-btn-primary px-4 py-1.5 text-xs"
              >
                {grading ? '…' : 'Grade'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Voice status strip */}
      {voiceOn && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2.5 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${listening ? 'bg-good animate-ping' : speaking ? 'bg-accent animate-ping' : 'bg-muted/40'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${listening ? 'bg-good' : speaking ? 'bg-accent' : 'bg-muted/60'}`} />
            </span>
            <span className="text-sm text-ink flex-1 truncate">
              {speaking ? 'Kaizen is speaking…'
                : transcribing ? 'Transcribing…'
                : streaming ? 'Thinking…'
                : listening ? 'Listening. Just talk.'
                : 'Voice conversation on'}
            </span>
            <span className="k-label hidden sm:inline">Whisper · hands-free</span>
          </div>
        </div>
      )}

      {/* Voice error (mic denied / OpenAI key missing) */}
      {voiceError && (
        <div className="bg-bad/10 border-b border-bad/20 px-4 py-2 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-bad">
            <span className="flex-1">{voiceError}</span>
            <button onClick={() => setVoiceError('')} className="font-semibold shrink-0 hover:underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Docs in context chip */}
      {hasDocs && !voiceOn && (
        <div className="px-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-3 py-1.5 text-xs font-medium text-accent">
              Using your files: {documents.map(d => d.name).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <div className="max-w-narrow mx-auto mt-10 text-center space-y-5 animate-fadeUp">
              <div className="flex justify-center"><KaizenMark size={44} /></div>
              <div className="text-body text-muted">
                {isCurious
                  ? <>Let&apos;s wander. Ask me anything about <strong className="text-ink font-semibold">{concept.name}</strong>, or pick a door below.</>
                  : isNew
                    ? <>Tell me what you already know about <strong className="text-ink font-semibold">{concept.name}</strong>, honestly. That&apos;s where we start.</>
                    : <>Welcome back. Your mastery is <strong className={`font-opmono tabular-nums font-semibold ${TEXT[status]}`}>{pct}%</strong>. Let&apos;s push it higher.</>
                }
              </div>
              <div className="text-sm text-muted">
                {isCurious ? 'No grades here. Pure exploration.' : 'I won’t just hand you answers. I’ll pull the understanding out of you.'}
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {(isCurious
                  ? [
                      { label: 'Surprise me', text: 'Go, hit me with the most surprising thing about this.' },
                      { label: 'Start from zero', text: 'Assume I know nothing. Where does this story begin?' },
                    ]
                  : isNew
                    ? [
                        { label: "I don't know where to start", text: "I don't know where to start." },
                        { label: 'Give me the big picture', text: 'Give me the big picture of this concept first.' },
                        { label: 'Quiz me', text: 'Quiz me on this.' },
                      ]
                    : [
                        { label: 'Quiz me', text: 'Quiz me on this.' },
                        { label: 'Review the tricky parts', text: 'Review the parts of this I usually get wrong.' },
                      ]
                ).map((s) => (
                  <button key={s.label} onClick={() => send(s.text)} className="k-chip">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && !isCurious && (
            <div className="flex justify-center pb-1">
              <button
                onClick={startFresh}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
              >
                <IconRefresh size={13} />
                Start a fresh chat (memory saved automatically)
              </button>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                <span className="shrink-0 mb-1 hidden sm:block"><KaizenMark size={20} /></span>
              )}
              <div className={[
                'max-w-[82%] text-body px-4 py-3',
                m.role === 'user'
                  ? 'bg-accent text-paper rounded-md rounded-br-sm shadow-soft whitespace-pre-wrap'
                  : 'bg-panel text-ink border border-border rounded-md rounded-bl-sm shadow-soft',
              ].join(' ')}>
                {m.role === 'user'
                  ? m.content
                  : (m.content
                      ? <MessageBody content={m.content} live={streaming && i === messages.length - 1} />
                      : <span className="opacity-40">…</span>)}
              </div>
            </div>
          ))}

          {transcribing && (
            <div className="flex justify-end">
              <div className="max-w-[82%] text-sm px-4 py-3 bg-accent/10 border border-accent/20 text-muted rounded-md rounded-br-sm italic">
                transcribing your answer…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grade result */}
      {gradeResult && (
        <div className="px-4 mb-2 shrink-0">
          <div className="max-w-3xl mx-auto k-card-sm px-4 py-4 shadow-lift animate-fadeUp">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="k-label">Recall quality</span>
              <span className={`font-opmono text-sm font-semibold tabular-nums ${qualityColor}`}>
                {gradeResult.quality}/5 · {QUALITY_LABEL[gradeResult.quality]}
              </span>
            </div>
            {gradeResult.rationale && (
              <p className="text-xs text-muted">{gradeResult.rationale}</p>
            )}
            <p className="text-xs text-muted mt-1.5">
              {gradeResult.quality >= 4 ? 'Locked in. I’ll bring it back right before it fades.' : gradeResult.quality >= 3 ? 'Good base. We’ll revisit this a little sooner.' : 'No stress. This topic gets another pass soon.'}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setGradeResult(null)}
                className="k-btn-secondary flex-1 py-2.5 text-sm"
              >
                Keep going
              </button>
              <button onClick={onBack} className="k-btn-primary flex-1 py-2.5 text-sm">
                Done for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adopt topic (curious mode) */}
      {isCurious && messages.length >= 2 && !adopted && onAdopt && (
        <div className="px-4 mb-2 shrink-0">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => { onAdopt(concept.name); setAdopted(true); }}
              className="k-btn-primary w-full py-2.5 text-sm"
            >
              <IconPlus size={15} />
              Add &quot;{concept.name}&quot; to my study topics
            </button>
          </div>
        </div>
      )}
      {adopted && (
        <div className="px-4 mb-2 shrink-0 flex items-center justify-center gap-1.5 text-xs font-medium text-good">
          <IconCheck size={13} />
          Added to your topics. It&apos;ll show up in Study.
        </div>
      )}

      {/* Learning moves — one tap, no typing */}
      {messages.length > 0 && !streaming && !voiceOn && !gradeResult && (
        <div className="px-4 pb-1.5 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(isCurious ? CURIOUS_ACTIONS : QUICK_ACTIONS).map((qa) => (
              <button key={qa.label} onClick={() => send(qa.text)} className="k-chip shrink-0 whitespace-nowrap">
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Teaching style — self-contained lessons vs. Socratic questioning */}
      {!isCurious && !voiceOn && !gradeResult && (
        <div className="px-4 pb-1 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs">
            <div className="inline-flex rounded-full bg-panel2 border border-border p-0.5">
              <button
                onClick={() => setTeachStyle('teach')}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${teachStyle === 'teach' ? 'bg-accent text-paper' : 'text-muted hover:text-ink'}`}
              >
                Teach me
              </button>
              <button
                onClick={() => setTeachStyle('socratic')}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${teachStyle === 'socratic' ? 'bg-accent text-paper' : 'text-muted hover:text-ink'}`}
              >
                Socratic
              </button>
            </div>
            <span className="text-muted hidden sm:inline">
              {teachStyle === 'teach' ? 'full mini-lessons with a worked example' : 'question-first, draws the idea out of you'}
            </span>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t border-border px-4 py-3 shrink-0 bg-panel/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={streaming}
            title="Upload a file for this session"
            className="w-10 h-10 rounded-full bg-panel2 text-muted hover:text-accent flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
          >
            <IconPlus size={17} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder={voiceOn ? 'Voice mode on, or type here…' : 'Explain your thinking…'}
            disabled={streaming}
            className="flex-1 resize-none bg-panel2 border border-border rounded-sm px-4 py-2.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center shrink-0 transition-[background-color,opacity] duration-150 hover:bg-ink/90 disabled:opacity-30"
          >
            <IconArrowUp size={18} strokeWidth={2.2} />
          </button>
        </div>
        <p className="max-w-3xl mx-auto text-center text-xs text-muted mt-2">
          Kaizen is an AI tutor, not a human, and can make mistakes ·{' '}
          <a href="/safety" className="text-accent underline underline-offset-2">safety &amp; reporting</a>
        </p>
      </div>
    </div>
  );
}
