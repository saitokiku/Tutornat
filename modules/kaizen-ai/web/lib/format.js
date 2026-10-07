// Shared display formatters (audit MAINT-002 — three slightly different
// money() copies had grown across components). Client-safe, no deps.

export function money(cents, { decimals = 0 } = {}) {
  return `$${((cents || 0) / 100).toFixed(decimals)}`;
}

export function when(iso) {
  try {
    return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(iso);
  }
}
