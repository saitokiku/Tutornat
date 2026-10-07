// Route transitions are opt-in per page. Wrap a page's content (in page.tsx, not a layout — layouts persist)
// and navigations into or out of it crossfade: the old page steps back fast, the new one rises 6px and
// settles. Reduced motion swaps instantly. Give the shell's rail and tab bar `k-vt-rail` / `k-vt-tabbar`
// so they stay still while the page moves.
import { ViewTransition, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="k-page" exit="k-page" default="none">
      {children}
    </ViewTransition>
  );
}
