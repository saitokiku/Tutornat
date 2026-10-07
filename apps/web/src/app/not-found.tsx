import Link from "next/link";
import { KaizenLogo } from "@/components/brand";

// Rendered on the server without the browser store, so it is English-only and needs no locale.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-paper px-5 text-center">
      <KaizenLogo size={36} />
      <div>
        <h1 className="font-brand text-t1 font-semibold text-ink">This page isn&apos;t here</h1>
        <p className="mt-2 text-sm text-muted">The link may be old, or the page moved.</p>
      </div>
      <Link href="/" className="k-btn-primary">
        Go to KaizenEDU
      </Link>
    </main>
  );
}
