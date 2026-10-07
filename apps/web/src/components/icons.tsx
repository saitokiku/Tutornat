// KaizenEDU icons, authored on one grid: 24px viewBox, live area 3–21, 1.8 stroke, round caps and joins,
// corner radius 1.5–2, currentColor so tokens do the theming. Dots are zero-length strokes, so they share
// the stroke weight. Decorative by default; label the control, not the icon. Never an emoji in their place.
// In the K–2 band (data-band="k2") every icon grows by --icon-scale.
import type { CSSProperties, ReactNode } from "react";

type P = { size?: number; className?: string; strokeWidth?: number };

function I({ children, size = 20, strokeWidth = 1.8, className = "" }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`k-icon ${className}`.trim()}
      style={{ "--k-icon-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// —— Navigation and places

export const IconHome = (p: P) => (
  <I {...p}>
    <path d="M4 10.4 12 4l8 6.4V19a1.5 1.5 0 0 1-1.5 1.5H15v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H5.5A1.5 1.5 0 0 1 4 19v-8.6Z" />
  </I>
);
export const IconBook = (p: P) => (
  <I {...p}>
    <path d="M12 6.5C10 4.9 7.2 4.3 4 4.6v13.9c3.2-.3 6 .3 8 1.9 2-1.6 4.8-2.2 8-1.9V4.6c-3.2-.3-6 .3-8 1.9Z" />
    <path d="M12 6.5v13.9" />
  </I>
);
export const IconSprout = (p: P) => (
  <I {...p}>
    <path d="M12 21v-8.5" />
    <path d="M12 12.5C12 9 9.4 6.5 5.5 6.5c0 3.9 2.6 6 6.5 6Z" />
    <path d="M12 10.5c0-3.3 2.4-5.8 6.5-5.8 0 3.8-2.7 5.8-6.5 5.8Z" />
  </I>
);
/** A grown-up and a child. */
export const IconFamily = (p: P) => (
  <I {...p}>
    <circle cx="8.5" cy="7.5" r="2.8" />
    <circle cx="17" cy="9.8" r="2.1" />
    <path d="M3.5 19.5c.4-3.4 2.4-5.5 5-5.5s4.6 2.1 5 5.5M14 19.5c.3-2.5 1.4-4 3-4s2.7 1.5 3 4" />
  </I>
);
/** One adult: the grown-up's door, the parent gate. */
export const IconGrownUp = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="7.5" r="3.2" />
    <path d="M5.5 20c.6-4 3.1-6.3 6.5-6.3s5.9 2.3 6.5 6.3" />
  </I>
);
/** A cog. (Until 2026-10 this drew rays and read as a sun.) */
export const IconSettings = (p: P) => (
  <I {...p}>
    <path d="M10.37 5.19 10.59 3.11h2.82l.22 2.08A7 7 0 0 1 15.66 6.03l1.63-1.31 1.99 1.99-1.31 1.63A7 7 0 0 1 18.81 10.37l2.08.22v2.82l-2.08.22A7 7 0 0 1 17.97 15.66l1.31 1.63-1.99 1.99-1.63-1.31A7 7 0 0 1 13.63 18.81l-.22 2.08h-2.82l-.22-2.08A7 7 0 0 1 8.34 17.97l-1.63 1.31-1.99-1.99 1.31-1.63A7 7 0 0 1 5.19 13.63l-2.08-.22v-2.82l2.08-.22A7 7 0 0 1 6.03 8.34L4.72 6.71l1.99-1.99 1.63 1.31A7 7 0 0 1 10.37 5.19Z" />
    <circle cx="12" cy="12" r="2.6" />
  </I>
);
export const IconCalendar = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01" strokeWidth="2.2" />
  </I>
);
export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
);
export const IconSearch = (p: P) => (
  <I {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.4 15.4 4.6 4.6" />
  </I>
);
/** A folded map: the skill map. */
export const IconMap = (p: P) => (
  <I {...p}>
    <path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2Z" />
    <path d="M9 4.5v13M15 6.5v13" />
  </I>
);
export const IconLogout = (p: P) => (
  <I {...p}>
    <path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16l-4-4 4-4M6 12h9.5" />
  </I>
);
export const IconLock = (p: P) => (
  <I {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 15v1.5" />
  </I>
);

// —— Subjects

/** Math: the four operations. */
export const IconMath = (p: P) => (
  <I {...p}>
    <path d="M7.5 4.5v6M4.5 7.5h6M13.5 7.5h6M5 14.5l5 5M10 14.5l-5 5M13.5 17h6" />
    <path d="M16.5 14.2h.01M16.5 19.8h.01" strokeWidth="2.2" />
  </I>
);
/** Science: a flask. */
export const IconScience = (p: P) => (
  <I {...p}>
    <path d="M9.5 3.5h5M10.5 3.5v5.2L5.3 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.7-2.9l-5.2-8.9V3.5" />
    <path d="M7.6 14.5h8.8" />
  </I>
);
/** English: letters, capital and small. */
export const IconEnglish = (p: P) => (
  <I {...p}>
    <path d="M3.5 18.5 8 6l4.5 12.5M5.2 14h5.6" />
    <circle cx="16.9" cy="15.3" r="3.2" />
    <path d="M20.1 12v6.5" />
  </I>
);

// —— Learning

/** A stack of problems: practice. */
export const IconLayers = (p: P) => (
  <I {...p}>
    <path d="M12 4 3.5 8.5 12 13l8.5-4.5L12 4Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </I>
);
export const IconPractice = IconLayers;
/** The teaching board: a lesson. */
export const IconBoard = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
    <path d="M8 20.5l4-4 4 4" />
  </I>
);
export const IconLesson = IconBoard;
export const IconChat = (p: P) => (
  <I {...p}>
    <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" />
  </I>
);
/** Ask the tutor: a question in a bubble. */
export const IconTutor = (p: P) => (
  <I {...p}>
    <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" />
    <path d="M10 9.4a2 2 0 1 1 2.8 1.8c-.5.2-.8.6-.8 1.1v.2" />
    <path d="M12 14.6h.01" strokeWidth="2.2" />
  </I>
);
/** A worksheet: homework. */
export const IconHomework = (p: P) => (
  <I {...p}>
    <path d="M6.5 3.5h7l4.5 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" />
    <path d="M13.5 3.5V8H18M8.5 12h7M8.5 15.5h5" />
  </I>
);
/** A clipboard with a check: a test or quiz. */
export const IconTest = (p: P) => (
  <I {...p}>
    <path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V6.5A1.5 1.5 0 0 0 17.5 5H15" />
    <rect x="9" y="3.5" width="6" height="3" rx="1" />
    <path d="m9 13.5 2.2 2.2 4.3-4.6" />
  </I>
);
export const IconLightbulb = (p: P) => (
  <I {...p}>
    <path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v1h5v-1c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5Z" />
  </I>
);
export const IconHint = IconLightbulb;
export const IconEye = (p: P) => (
  <I {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </I>
);
export const IconHand = (p: P) => (
  <I {...p}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4a1.5 1.5 0 0 1 3 0v6m0-1a1.5 1.5 0 0 1 3 0v4.5a6.5 6.5 0 0 1-6.5 6.5h-.6a6 6 0 0 1-4.6-2.2L4.2 14a1.5 1.5 0 0 1 2.3-1.9L9 14.5" />
  </I>
);
/** A sticky note: a grown-up's note. */
export const IconNote = (p: P) => (
  <I {...p}>
    <path d="M14 20H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5V15l-5 5Z" />
    <path d="M14 20v-3.5a1.5 1.5 0 0 1 1.5-1.5H19M8.5 8.5h7M8.5 11.5h4.5" />
  </I>
);

// —— Marks. Honest, star-free: a check is a check, "not yet" is unfinished, never a cross.

/** Strokes carry pathLength="1" so `className="k-draw"` draws them like a pen mark. */
export const IconCheck = (p: P) => (
  <I {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
  </I>
);
export const IconCheckCircle = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8 12.3l2.7 2.7L16 9.7" pathLength={1} />
  </I>
);
/** Not yet: a ring still being drawn. Use for an unfinished or missed item instead of an X. */
export const IconNotYet = (p: P) => (
  <I {...p}>
    <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" />
    <path d="M16.25 4.64h.01M19.36 7.75h.01" strokeWidth="2.2" />
  </I>
);
/** Skill status marks, in order: new · practicing · check ready · passed one check · proved · needs a refresh. */
export const IconMarkNew = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7" />
  </I>
);
export const IconMarkPracticing = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 12V5a7 7 0 0 1 7 7Z" fill="currentColor" />
  </I>
);
export const IconMarkCheckReady = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
  </I>
);
export const IconMarkPassedOne = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 5a7 7 0 0 1 0 14Z" fill="currentColor" />
  </I>
);
export const IconMarkProved = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="7.9" fill="currentColor" stroke="none" />
    <path d="m8.6 12.2 2.4 2.4 4.4-4.8" style={{ stroke: "var(--color-panel)" }} strokeWidth="2" pathLength={1} />
  </I>
);
export const IconMarkRefresh = (p: P) => (
  <I {...p}>
    <path d="M19 12a7 7 0 1 1-2.05-4.95" />
    <path d="M17.5 3.8v3.6h-3.6" />
  </I>
);

// —— Actions

export const IconPlus = (p: P) => (
  <I {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </I>
);
export const IconMinus = (p: P) => (
  <I {...p}>
    <path d="M5.5 12h13" />
  </I>
);
export const IconX = (p: P) => (
  <I {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </I>
);
/** Delete the last digit: a key pointing left with a small x. On a keypad an IconX reads as "times". */
export const IconBackspace = (p: P) => (
  <I {...p}>
    <path d="M8.2 5.5h10.3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.2L3.5 12l4.7-6.5Z" />
    <path d="m11.5 9.75 4.5 4.5M16 9.75l-4.5 4.5" />
  </I>
);
export const IconArrowRight = (p: P) => (
  <I {...p}>
    <path d="M5 12h13.5M13 6l5.5 6-5.5 6" />
  </I>
);
export const IconArrowLeft = (p: P) => (
  <I {...p}>
    <path d="M19 12H5.5M11 6l-5.5 6 5.5 6" />
  </I>
);
export const IconArrowUp = (p: P) => (
  <I {...p}>
    <path d="M12 19V5.5M6 11l6-5.5 6 5.5" />
  </I>
);
export const IconArrowDown = (p: P) => (
  <I {...p}>
    <path d="M12 5v13.5M6 13l6 5.5 6-5.5" />
  </I>
);
export const IconChevronLeft = (p: P) => (
  <I {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </I>
);
export const IconChevronRight = (p: P) => (
  <I {...p}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </I>
);
export const IconChevronUp = (p: P) => (
  <I {...p}>
    <path d="M5.5 14.5 12 8l6.5 6.5" />
  </I>
);
export const IconChevronDown = (p: P) => (
  <I {...p}>
    <path d="M5.5 9.5 12 16l6.5-6.5" />
  </I>
);
export const IconRefresh = (p: P) => (
  <I {...p}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2L20 9.5M20 4.5v5h-5" />
    <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2L4 14.5M4 19.5v-5h5" />
  </I>
);
export const IconUndo = (p: P) => (
  <I {...p}>
    <path d="M8.5 5.5 4 10l4.5 4.5" />
    <path d="M4 10h9.5a5.5 5.5 0 0 1 0 11H10" />
  </I>
);
export const IconPen = (p: P) => (
  <I {...p}>
    <path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5Z" />
  </I>
);
export const IconTrash = (p: P) => (
  <I {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />
  </I>
);
export const IconPaperclip = (p: P) => (
  <I {...p}>
    <path d="m19 11.5-7.2 7.2a4.6 4.6 0 0 1-6.5-6.5l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.4 7.4a1.4 1.4 0 0 1-2-2l6.7-6.7" />
  </I>
);
export const IconUpload = (p: P) => (
  <I {...p}>
    <path d="M12 15.5V4M7 9l5-5 5 5M5 19.5h14" />
  </I>
);
export const IconDownload = (p: P) => (
  <I {...p}>
    <path d="M12 4v11.5M7 10.5l5 5 5-5M5 19.5h14" />
  </I>
);
export const IconPrint = (p: P) => (
  <I {...p}>
    <path d="M7 9V4.5h10V9" />
    <path d="M7 17.5H5.5A1.5 1.5 0 0 1 4 16v-5.5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 1-1.5 1.5H17" />
    <path d="M7 14h10v6.5H7z" />
  </I>
);
/** Leaves KaizenEDU: a source, a library. */
export const IconExternal = (p: P) => (
  <I {...p}>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13" />
    <path d="M17.5 14v4a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8A1.5 1.5 0 0 1 6 6.5h4" />
  </I>
);
export const IconDots = (p: P) => (
  <I {...p}>
    <path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth="2.6" />
  </I>
);

// —— Media: the camera stays off unless a person turns it on; the mic is push-to-talk with visible state.

export const IconPhoto = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="9.5" r="1.6" />
    <path d="m4 18 5-5.2 4 4 2.5-2.5 5 4.7" />
  </I>
);
export const IconCamera = (p: P) => (
  <I {...p}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.5-2.2h5.4L16.2 7h2.3A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V8.5Z" />
    <circle cx="12" cy="13" r="3.3" />
  </I>
);
export const IconMic = (p: P) => (
  <I {...p}>
    <rect x="9" y="3.5" width="6" height="10.5" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3M9 20.5h6" />
  </I>
);
export const IconKeyboard = (p: P) => (
  <I {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M10.3 10h.01M13.7 10h.01M17 10h.01M7 13h.01M17 13h.01" strokeWidth="2.2" />
    <path d="M9.5 14.5h5" />
  </I>
);
export const IconSpeaker = (p: P) => (
  <I {...p}>
    <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </I>
);
export const IconReadAloud = IconSpeaker;
export const IconPlay = (p: P) => (
  <I {...p}>
    <path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4A.8.8 0 0 0 8 5.6Z" />
  </I>
);
export const IconPause = (p: P) => (
  <I {...p}>
    <rect x="6.5" y="5.5" width="3.5" height="13" rx="1" />
    <rect x="14" y="5.5" width="3.5" height="13" rx="1" />
  </I>
);
export const IconStop = (p: P) => (
  <I {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
  </I>
);

// —— Status (Notice tones)

export const IconInfo = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" strokeWidth="2.2" />
  </I>
);
export const IconAlert = (p: P) => (
  <I {...p}>
    <path d="M10.3 4.6 3.6 16.5A2 2 0 0 0 5.3 19.5h13.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4" />
    <path d="M12 16.4h.01" strokeWidth="2.2" />
  </I>
);
