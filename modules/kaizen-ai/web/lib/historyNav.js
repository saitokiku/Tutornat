'use client';

// Browser-history glue for the single-page dashboard, fixing the two classic
// SPA complaints: Back/Forward doesn't switch tabs, and Back from a modal or
// full-screen session exits the whole site.
//
// useTabHistory  — tab ↔ ?tab= URL sync with real history entries, plus
//                  last-tab restore from localStorage.
// useHistoryLayer — gives any open/close layer (modal, session view) a history
//                  entry so Back closes the layer. Close functions must be
//                  idempotent (all of ours are setState(null/false)).

import { useEffect, useRef } from 'react';

export function useTabHistory(tab, setTab, validIds, storageKey = 'kaizen.lastTab') {
  const fromPop = useRef(false);
  const initialized = useRef(false);

  // 1) On mount: URL ?tab= wins, then the last tab used on this device.
  useEffect(() => {
    let initial = null;
    try {
      const q = new URLSearchParams(window.location.search).get('tab');
      if (q && validIds.includes(q)) initial = q;
      else {
        const stored = window.localStorage.getItem(storageKey);
        if (stored && validIds.includes(stored)) initial = stored;
      }
    } catch { /* noop */ }
    if (initial && initial !== tab) { fromPop.current = true; setTab(initial); }
    try {
      const t = initial || tab;
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t);
      window.history.replaceState({ ...(window.history.state || {}), kz_tab: t }, '', url);
    } catch { /* noop */ }
    initialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) User switched tabs → a real history entry (+ remember for next visit).
  useEffect(() => {
    if (!initialized.current) return;
    if (fromPop.current) { fromPop.current = false; return; }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({ kz_tab: tab }, '', url);
      window.localStorage.setItem(storageKey, tab);
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 3) Back/Forward → restore that entry's tab.
  useEffect(() => {
    const onPop = (e) => {
      const t = e.state?.kz_tab;
      if (t && validIds.includes(t) && t !== tab) { fromPop.current = true; setTab(t); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setTab, validIds, tab]);
}

export function useHistoryLayer(open, onClose, id = 'layer') {
  const openRef = useRef(false);
  const closedByPop = useRef(false);
  const key = `kz_${id}`;

  useEffect(() => {
    if (open && !openRef.current) {
      openRef.current = true;
      closedByPop.current = false;
      try {
        window.history.pushState({ ...(window.history.state || {}), [key]: true }, '');
      } catch { /* noop */ }
    } else if (!open && openRef.current) {
      openRef.current = false;
      // Closed from the UI (✕ / Done) — retire the entry we pushed so the next
      // Back doesn't need a double-press. Skip if Back itself closed us.
      if (!closedByPop.current) {
        try { if (window.history.state?.[key]) window.history.back(); } catch { /* noop */ }
      }
      closedByPop.current = false;
    }
  }, [open, key]);

  useEffect(() => {
    const onPop = () => {
      if (openRef.current && !window.history.state?.[key]) {
        closedByPop.current = true;
        onClose?.();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onClose, key]);
}
