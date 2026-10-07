// App-level state: setup, profile, courses, assignments, streak, activity.
// localStorage for the demo; swap for Supabase/Postgres later without
// touching the components (same load/save interface).

const KEY = 'kaizen.app.v1';

export function defaultAppState() {
  return {
    setupDone: false,
    profile: { name: '' },
    school: null,
    courses: [],
    assignments: [],
    streak: { count: 0, lastDate: null },
    activity: [],        // ['2026-07-04', ...] days with any study/homework action
    masteryHistory: [],  // [{ at: ISO, avg: 0-100 }]
    gradeHistory: [],    // [{ at: ISO, gpa: 0-4 }]
  };
}

export function loadAppState() {
  if (typeof window === 'undefined') return defaultAppState();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...defaultAppState(), ...JSON.parse(raw) } : defaultAppState();
  } catch {
    return defaultAppState();
  }
}

export function saveAppState(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full/unavailable — non-fatal for demo
  }
}

export function resetAppState() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem('kaizen.concepts.v1');
  window.localStorage.removeItem('kaizen.devlog.v1');
}

// Wipe ALL locally-cached learning data. Used on logout so the next person to
// use this browser starts clean and no prior user's courses/chats can leak (or
// be migrated) into their account (audit: shared-device data bleed).
const OWNER_KEY = 'kaizen.owner.v1';
export function clearLocalData() {
  if (typeof window === 'undefined') return;
  for (const k of ['kaizen.app.v1', 'kaizen.concepts.v1', 'kaizen.chats.v1', 'kaizen.files.v1', 'kaizen.devlog.v1', OWNER_KEY]) {
    try { window.localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

// Stamp which signed-in account the local cache belongs to, so we can tell a
// genuine anonymous-demo→account upgrade (safe to migrate) from someone else's
// leftover data on a shared device (must NOT migrate).
export function getLocalOwner() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(OWNER_KEY); } catch { return null; }
}
export function setLocalOwner(id) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(OWNER_KEY, id); } catch { /* ignore */ }
}

function dayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Record activity today and update the streak. Returns updated state slice.
export function touchStreak(state) {
  const today = dayStr();
  const { streak, activity } = state;

  const newActivity = activity.includes(today) ? activity : [...activity, today];

  if (streak.lastDate === today) {
    return { streak, activity: newActivity };
  }

  const yesterday = dayStr(new Date(Date.now() - 86400000));
  const count = streak.lastDate === yesterday ? streak.count + 1 : 1;

  return { streak: { count, lastDate: today }, activity: newActivity };
}

export function isToday(iso) {
  return dayStr(new Date(iso)) === dayStr();
}

export function isOverdue(iso) {
  return new Date(iso).getTime() < Date.now() && !isToday(iso);
}

export function daysUntil(iso) {
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function dueLabel(iso) {
  const d = daysUntil(iso);
  if (d < 0) return 'Overdue';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 7) return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' });
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
