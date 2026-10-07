// Ported from Kaizen-AI's icon set (modules/kaizen-ai/web/components/Icons.js): 24px grid, 1.8 stroke,
// currentColor so tokens do the theming. Decorative by default; label the control, not the icon.
import type { ReactNode } from "react";

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
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: P) => (
  <I {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" />
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
export const IconFamily = (p: P) => (
  <I {...p}>
    <circle cx="8" cy="7.5" r="2.8" />
    <circle cx="16.5" cy="9.5" r="2.2" />
    <path d="M3 19.5c.4-3.4 2.4-5.5 5-5.5s4.6 2.1 5 5.5M13.5 19.5c.3-2.6 1.5-4.2 3-4.2s2.7 1.6 3 4.2" />
  </I>
);
export const IconSettings = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" />
  </I>
);
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
export const IconCheck = (p: P) => (
  <I {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </I>
);
export const IconX = (p: P) => (
  <I {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
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
export const IconClock = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
);
export const IconRefresh = (p: P) => (
  <I {...p}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2L20 9.5M20 4.5v5h-5" />
    <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2L4 14.5M4 19.5v-5h5" />
  </I>
);
export const IconPaperclip = (p: P) => (
  <I {...p}>
    <path d="m19 11.5-7.2 7.2a4.6 4.6 0 0 1-6.5-6.5l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.4 7.4a1.4 1.4 0 0 1-2-2l6.7-6.7" />
  </I>
);
export const IconSpeaker = (p: P) => (
  <I {...p}>
    <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </I>
);
export const IconStop = (p: P) => (
  <I {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
  </I>
);
export const IconTrash = (p: P) => (
  <I {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />
  </I>
);
export const IconPen = (p: P) => (
  <I {...p}>
    <path d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5Z" />
  </I>
);
export const IconLogout = (p: P) => (
  <I {...p}>
    <path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16l-4-4 4-4M6 12h9.5" />
  </I>
);
export const IconChat = (p: P) => (
  <I {...p}>
    <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z" />
  </I>
);
export const IconLayers = (p: P) => (
  <I {...p}>
    <path d="M12 4 3.5 8.5 12 13l8.5-4.5L12 4Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </I>
);
export const IconLightbulb = (p: P) => (
  <I {...p}>
    <path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v1h5v-1c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5Z" />
  </I>
);
export const IconBoard = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="4.5" width="17" height="12" rx="2" />
    <path d="M8 20.5l4-4 4 4" />
  </I>
);
