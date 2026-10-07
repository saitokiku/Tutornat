import { Suspense } from "react";
import { BrowserOnly, Guard, PageFallback } from "@/components/gate";

export default function BareLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <BrowserOnly>
        <Guard need="account">{children}</Guard>
      </BrowserOnly>
    </Suspense>
  );
}
