// Engine telemetry for the dev inspector ("Prius dash").
// Every meaningful action in the app pushes an event here; the DevDash
// overlay subscribes and renders the live pipeline. Ring buffer of 200.

const KEY = 'kaizen.devlog.v1';
const MAX = 200;
const listeners = new Set();

function read() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(events) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
  } catch { /* non-fatal */ }
}

// stage: one of the ENGINE_STAGES ids below
export function logEvent(stage, label, detail = '') {
  const event = {
    at: new Date().toISOString(),
    stage,
    label,
    detail: String(detail).slice(0, 300),
  };
  const events = [...read(), event];
  write(events);
  listeners.forEach((fn) => fn(event, events));
  return event;
}

export function getEvents() {
  return read();
}

export function clearEvents() {
  write([]);
  listeners.forEach((fn) => fn(null, []));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// The pipeline map shown in the inspector. Mirrors the real backend
// LangGraph nodes so the demo teaches the actual architecture.
export const ENGINE_STAGES = [
  { id: 'input',    label: 'Input',            desc: 'Student message / action enters the system' },
  { id: 'intake',   label: 'AI Intake',        desc: 'Claude parses a syllabus / brain dump into courses, topics, assignments' },
  { id: 'context',  label: 'Context Retrieval', desc: 'Syllabus topics + mastery state + uploaded files loaded' },
  { id: 'strategy', label: 'Strategy Select',  desc: 'Pedagogy chosen: socratic / explain / quiz…' },
  { id: 'llm',      label: 'Claude Generate',  desc: 'claude-sonnet-5 streams the tutor response' },
  { id: 'grade',    label: 'Understanding Grade', desc: 'Transcript scored 0–5 on SuperMemo scale' },
  { id: 'sm2',      label: 'SM-2 Engine',      desc: 'Ease factor, interval, next review computed' },
  { id: 'store',    label: 'State Store',      desc: 'Mastery, streak, history persisted' },
];
