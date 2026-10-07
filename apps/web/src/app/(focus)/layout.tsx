import { Suspense } from "react";
import { BrowserOnly, Guard, PageFallback } from "@/components/gate";

// The lesson stage gets the whole screen: no rail, its own header.
// Demo data lives in this browser, so these routes render client-side behind a fallback and are
// not expected to navigate instantly from the server (Cache Components validation opt-out).
export const instant = false;

export default function FocusLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <BrowserOnly>
        <Guard need="learner">{children}</Guard>
      </BrowserOnly>
    </Suspense>
  );
}
