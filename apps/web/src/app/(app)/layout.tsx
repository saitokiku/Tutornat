import { Suspense } from "react";
import { BrowserOnly, Guard, PageFallback } from "@/components/gate";
import { AppShell } from "@/components/shell/AppShell";

// Demo data lives in this browser, so these routes render client-side behind a fallback and are
// not expected to navigate instantly from the server (Cache Components validation opt-out).
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <BrowserOnly>
        <Guard need="selected">
          <AppShell>{children}</AppShell>
        </Guard>
      </BrowserOnly>
    </Suspense>
  );
}
