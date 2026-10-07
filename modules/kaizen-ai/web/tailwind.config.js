/** @type {import('tailwindcss').Config} */
// The system, in one file (spec: docs/superpowers/specs/2026-08-22-one-system-rebuild.md).
// Every decision a page could otherwise re-make locally lives here: one palette, one
// type scale, one radius scale. An arbitrary text-[Npx] or rounded-[Npx] in a page is
// a bug, not a style choice.
//
// Colors are declared as CSS variables in globals.css and referenced here, so a dark
// mode is a later variable flip rather than a rewrite of every component.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        paper: token('paper'),      // the base everything sits on
        panel: token('panel'),      // raised cards
        panel2: token('panel2'),    // inset surfaces, table headers
        border: token('border'),    // hairlines
        // Text
        ink: token('ink'),          // primary
        muted: token('muted'),      // secondary (AA on every surface above)
        // Brand
        accent: token('accent'),    // marks, links, selection. NOT the action color.
        // Status
        good: token('good'),
        warn: token('warn'),
        bad: token('bad'),
        // The one dark surface: /ai, full page. Never a mid-page inversion.
        coal: token('coal'),
        coal2: token('coal2'),
        nightline: token('nightline'),
        ember: token('ember'),
        nightmuted: token('nightmuted'),
      },
      fontFamily: {
        brand: ['var(--font-brand)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        opmono: ['var(--font-opmono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // Legacy aliases: kept mapped so no surface can silently re-font during the
        // migration. Prefer brand/body/opmono in new code.
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-brand)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-opmono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // One type scale. d* = display, t* = titles, then prose sizes. Tracking and
      // leading travel WITH the size, which is the part pages kept getting wrong.
      fontSize: {
        d1: ['3.75rem', { lineHeight: '1.02', letterSpacing: '-0.032em' }],   // 60
        d2: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],    // 44
        d3: ['2.125rem', { lineHeight: '1.08', letterSpacing: '-0.025em' }],  // 34
        t1: ['1.625rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],   // 26
        t2: ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.015em' }],   // 20
        t3: ['1.0625rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],   // 17
        body: ['1rem', { lineHeight: '1.6' }],                                // 16
        sm: ['0.875rem', { lineHeight: '1.55' }],                             // 14
        xs: ['0.8125rem', { lineHeight: '1.5' }],                             // 13
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em' }], // 11, labels
      },
      // One radius scale. Inputs 10, cards 14, large panels 20, buttons pill.
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '20px',
      },
      boxShadow: {
        // Neutral elevation, tinted to the ink rather than to brown.
        soft: '0 1px 2px rgba(20, 19, 16, 0.04), 0 4px 16px -8px rgba(20, 19, 16, 0.08)',
        lift: '0 2px 4px rgba(20, 19, 16, 0.04), 0 12px 32px -12px rgba(20, 19, 16, 0.14)',
        glow: '0 4px 24px -6px rgba(169, 59, 93, 0.30)',
      },
      maxWidth: {
        // Three measures, chosen once. prose = a reading column, wide = the grid,
        // narrow = forms and focused product panels.
        prose: '46rem',
        narrow: '34rem',
        wide: '72rem',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)', opacity: '0.85' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both',
        breathe: 'breathe 2.4s ease-in-out infinite',
        marquee: 'marquee 36s linear infinite',
      },
    },
  },
  plugins: [],
};
