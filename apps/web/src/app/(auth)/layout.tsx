import { Suspense } from "react";
import { BrowserOnly, PageFallback } from "@/components/gate";
import { AuthFrame } from "@/components/auth/AuthFrame";

// Demo data lives in this browser, so these routes render client-side behind a fallback and are
// not expected to navigate instantly from the server (Cache Components validation opt-out).
export const instant = false;

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <BrowserOnly>
        <AuthFrame>{children}</AuthFrame>
      </BrowserOnly>
    </Suspense>
  );
}
