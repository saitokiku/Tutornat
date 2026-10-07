import { Suspense } from "react";
import { BrowserOnly, PageFallback } from "@/components/gate";
import { AuthFrame } from "@/components/auth/AuthFrame";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <BrowserOnly>
        <AuthFrame>{children}</AuthFrame>
      </BrowserOnly>
    </Suspense>
  );
}
