// The shell's frame while this browser's saved data is read: the rail (wide) or header and bar (phone)
// already in place, the page column in its final position, a calm placeholder where the title goes.
// Server-rendered, so it is the first paint; the real shell then fills the same boxes without moving.
import { KaizenLogo, KaizenMark, KaizenWordmark } from "@/components/brand";
import { Skeleton } from "@/components/ui";
import "./shell.css";

export function ShellFallback() {
  return (
    <div aria-busy="true" className="min-h-dvh bg-paper">
      <div className="fixed inset-y-0 left-0 hidden w-(--k-rail) flex-col border-r border-border bg-panel2 lg:flex">
        <div className="px-5 pt-6 pb-5">
          {/* An empty caption line keeps the logo exactly where the shell's (captioned) logo will be. */}
          <KaizenLogo size={32} caption={" "} />
        </div>
      </div>
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-1 lg:hidden">
        <span className="flex min-h-target items-center gap-2">
          <KaizenMark size={28} />
          <KaizenWordmark size={16} className="max-[22.5rem]:hidden" />
        </span>
      </div>
      <div className="lg:pl-(--k-rail)">
        <div className="mx-auto max-w-4xl space-y-4 px-gutter pt-4 lg:px-8 lg:pt-10">
          <Skeleton className="h-9 w-44 rounded-sm" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="h-15" />
      </div>
    </div>
  );
}
