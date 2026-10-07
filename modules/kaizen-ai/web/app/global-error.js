'use client';

// Root-level error boundary (replaces the whole document when the root layout
// itself throws). Inline styles with LITERAL hex, deliberately: this renders
// when globals.css may not have loaded, so a CSS variable would resolve to
// nothing and the card would come out unpainted. These values must be updated
// by hand whenever the palette moves.
// #FAFAF9 paper · #FFFFFF panel · #E4E3DF border · #1A1917 ink · #6B6862 muted
// · #A93B5D accent.

import { captureException } from '@/lib/monitoring';

export default function GlobalError({ error, reset }) {
  if (typeof console !== 'undefined') console.error('[kaizen] global error:', error);
  captureException(error, { boundary: 'global' });

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#FAFAF9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 360, background: '#FFFFFF', border: '1px solid #E4E3DF', borderRadius: 20, padding: 32, textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1917', margin: 0, letterSpacing: '-0.02em' }}>Something hiccuped</h1>
            <p style={{ fontSize: 14, color: '#6B6862', lineHeight: 1.55, marginTop: 8 }}>
              Your work is saved. Reload to keep going.
            </p>
            <button
              onClick={() => reset()}
              style={{ width: '100%', marginTop: 20, padding: '12px 0', borderRadius: 999, border: 'none', background: '#1A1917', color: '#FAFAF9', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
