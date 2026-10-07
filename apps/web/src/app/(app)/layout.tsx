import { Suspense } from "react";
import { BrowserOnly, Guard, PageFallback } from "@/components/gate";
import { AppShell } from "@/components/shell/AppShell";

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
