// Kaizen icon set — minimal rounded line icons, 24px grid, 1.8 stroke.
// Inherit color via currentColor so tokens do the theming.

function I({ children, size = 20, strokeWidth = 1.8, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconSun = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
  </I>
);

export const IconCalendar = (p) => (
  <I {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M8 3v4M16 3v4M3.5 10.5h17" />
  </I>
);

export const IconBook = (p) => (
  <I {...p}>
    <path d="M12 6.5C10 4.9 7.2 4.3 4 4.6v13.9c3.2-.3 6 .3 8 1.9 2-1.6 4.8-2.2 8-1.9V4.6c-3.2-.3-6 .3-8 1.9Z" />
    <path d="M12 6.5v13.9" />
  </I>
);

export const IconSprout = (p) => (
  <I {...p}>
    <path d="M12 21v-8.5" />
    <path d="M12 12.5C12 9 9.4 6.5 5.5 6.5c0 3.9 2.6 6 6.5 6Z" />
    <path d="M12 10.5c0-3.3 2.4-5.8 6.5-5.8 0 3.8-2.7 5.8-6.5 5.8Z" />
  </I>
);

export const IconPlus = (p) => (
  <I {...p}><path d="M12 5.5v13M5.5 12h13" /></I>
);

export const IconArrowUp = (p) => (
  <I {...p}><path d="M12 19V5.5M6 11l6-5.5 6 5.5" /></I>
);

export const IconMic = (p) => (
  <I {...p}>
    <rect x="9.25" y="3" width="5.5" height="11" rx="2.75" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18.5V21" />
  </I>
);

export const IconCheck = (p) => (
  <I {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>
);

export const IconSpark = (p) => (
  <I {...p}>
    <path d="M12 3.5l1.8 5.6 5.7 1.9-5.7 1.9L12 18.5l-1.8-5.6-5.7-1.9 5.7-1.9L12 3.5Z" />
  </I>
);

export const IconFlame = (p) => (
  <I {...p}>
    <path d="M12 3.5c.4 2.7 1.9 4.3 3.3 6 1.1 1.3 1.7 2.6 1.7 4a5 5 0 0 1-10 0c0-2.2 1.2-3.7 2.5-5.2 1-1.2 2.1-2.8 2.5-4.8Z" />
    <path d="M12 12.8c.8.9 1.4 1.6 1.4 2.7a1.4 1.4 0 1 1-2.8 0c0-1.1.6-1.8 1.4-2.7Z" />
  </I>
);

export const IconChevronRight = (p) => (
  <I {...p}><path d="M9.5 5.5L16 12l-6.5 6.5" /></I>
);

export const IconLeaf = (p) => (
  <I {...p}>
    <path d="M12 4c5 3.2 6 8.8 0 16C6 12.8 7 7.2 12 4Z" />
  </I>
);

export const IconX = (p) => (
  <I {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></I>
);

export const IconClock = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
);

export const IconRefresh = (p) => (
  <I {...p}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2L20 9.5M20 4.5v5h-5" />
    <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2L4 14.5M4 19.5v-5h5" />
  </I>
);

export const IconGrades = (p) => (
  <I {...p}>
    <path d="M4 19.5h16" />
    <rect x="5" y="11" width="3.4" height="6" rx="1" />
    <rect x="10.3" y="7" width="3.4" height="10" rx="1" />
    <rect x="15.6" y="13" width="3.4" height="4" rx="1" />
  </I>
);

// Direction. The product still types "→" and "←" into link text, where the
// glyph inherits the font's own weight and baseline and so never quite matches
// the label beside it. These sit on the same 24px grid as everything above.
export const IconArrowRight = (p) => (
  <I {...p}><path d="M5 12h13.5M13 6l5.5 6-5.5 6" /></I>
);

export const IconArrowLeft = (p) => (
  <I {...p}><path d="M19 12H5.5M11 6l-5.5 6 5.5 6" /></I>
);

export const IconChevronLeft = (p) => (
  <I {...p}><path d="M14.5 5.5L8 12l6.5 6.5" /></I>
);

// Undo, as in "reverse the thing I just recorded". Distinct from IconRefresh,
// which is a two-way cycle: this one goes back exactly once, which is what the
// admin write-off reversal and the demo reset actually do.
export const IconUndo = (p) => (
  <I {...p}>
    <path d="M4.5 9.5h9.5a5 5 0 0 1 0 10H9" />
    <path d="M8.5 5.5L4.5 9.5l4 4" />
  </I>
);

// One star, three fills. The silhouette is the stroked outline in all three
// cases and only the interior changes, so a filled star and an empty star
// occupy identical space in a rating row. The half fill runs to the path
// centreline, where the outline's stroke meets it, so there is no seam.
const STAR = 'M12 3.4L14.17 9.21L20.37 9.48L15.52 13.34L17.17 19.32L12 15.9L6.83 19.32L8.48 13.34L3.63 9.48L9.83 9.21Z';
const STAR_LEFT = 'M12 3.4L9.83 9.21L3.63 9.48L8.48 13.34L6.83 19.32L12 15.9Z';

export const IconStar = (p) => (
  <I {...p}><path d={STAR} fill="currentColor" /></I>
);

export const IconStarHalf = (p) => (
  <I {...p}>
    <path d={STAR_LEFT} fill="currentColor" stroke="none" />
    <path d={STAR} />
  </I>
);

export const IconStarEmpty = (p) => (
  <I {...p}><path d={STAR} /></I>
);
