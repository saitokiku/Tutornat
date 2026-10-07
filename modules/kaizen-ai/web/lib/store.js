// Persistence for concept/mastery state.
//
// For the POC this uses the browser's localStorage: zero setup, survives
// refresh, scoped to one browser. When you outgrow it (multi-device, real
// accounts), replace loadConcepts/saveConcepts with calls to a database
// behind an API route. The rest of the app doesn't need to change.

const KEY = 'kaizen.concepts.v1';

export function loadConcepts() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveConcepts(concepts) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(concepts));
  } catch {
    // storage unavailable or full — non-fatal for a POC
  }
}
