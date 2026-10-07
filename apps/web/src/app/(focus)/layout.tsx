import { Suspense } from "react";
import { BrowserOnly, Guard, PageFallback } from "@/components/gate";
import { FocusFrame } from "@/components/shell/route";

// Practice sets, lessons and the tutor get the whole screen: no rail, no bar, and each page's own
// header holds its single way back. The frame only moves focus to the page title after a navigation
// and keeps each learner's pages their own.
// Demo data lives in this browser, so these routes render client-side behind a fallback and are
// not expected to navigate instantly from the server (Cache Components validation opt-out).
export const instant = false;

export default function FocusLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <BrowserOnly>
        <Guard need="learner">
          <FocusFrame>{children}</FocusFrame>
        </Guard>
      </BrowserOnly>
    </Suspense>
  );
}
