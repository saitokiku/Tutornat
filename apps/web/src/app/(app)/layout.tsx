import { Suspense } from "react";
import { BrowserOnly, Guard } from "@/components/gate";
import { AppShell } from "@/components/shell/AppShell";
import { ShellFallback } from "@/components/shell/ShellFallback";

// Demo data lives in this browser, so these routes render client-side behind a fallback and are
// not expected to navigate instantly from the server (Cache Components validation opt-out).
// The fallback is the shell's own frame, so the first paint already has the rail or the bar in place.
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <BrowserOnly>
        <Guard need="selected">
          <AppShell>{children}</AppShell>
        </Guard>
      </BrowserOnly>
    </Suspense>
  );
}
