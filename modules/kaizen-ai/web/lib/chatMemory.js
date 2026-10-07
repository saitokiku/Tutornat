// Per-concept chat memory. Every tutoring conversation persists, so coming
// back to a topic continues where you left off — the tutor "remembers you".
// Keyed by concept NAME (stable sync key); ring-buffered to the last 40 messages per chat.

const KEY = 'kaizen.chats.v1';
const MAX_MESSAGES = 40;

function readAll() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage full: drop the oldest chats and retry once
    try {
      const entries = Object.entries(all).sort(
        (a, b) => new Date(a[1].updatedAt).getTime() - new Date(b[1].updatedAt).getTime()
      );
      const trimmed = Object.fromEntries(entries.slice(-12));
      window.localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch { /* quiet */ }
  }
}

export function loadChat(key) {
  const all = readAll();
  return all[key]?.messages || [];
}

export function saveChat(key, messages) {
  if (!key || !messages) return;
  const all = readAll();
  all[key] = {
    messages: messages.slice(-MAX_MESSAGES),
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

export function clearChat(key) {
  const all = readAll();
  delete all[key];
  writeAll(all);
}

export function loadAllChats() { return readAll(); }
export function replaceAllChats(all) { writeAll(all || {}); }
