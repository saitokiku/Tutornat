"use client";

// Who's learning, and a fast way to hand the device to someone else. A child can switch to a sibling in
// one tap; the grown-up view asks the grown-up question first, in place, unless a grown-up just passed it.
// Built on the native popover (top layer, Escape, outside tap, focus back to the opener).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { IconArrowLeft, IconCheck, IconGrownUp, IconLock, IconLogout, IconPlus } from "@/components/icons";
import { Avatar } from "@/components/profiles/Avatar";
import { Button, Field, IconButton, VisuallyHidden, announce } from "@/components/ui";
import { gradeLabel, useLocale, useT } from "@/i18n";
import { signOut } from "@/lib/auth";
import { currentAccount, currentLearner, learnersOf, selectLearner, unlockParent } from "@/lib/profiles";
import { useStore } from "@/lib/store";

export const SWITCHER_ID = "k-switcher";

/** Two chevrons, one up one down: "choose from a list". Drawn to the icon set's rules (24 grid, 1.8 stroke). */
function IconSelector({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`k-icon ${className}`.trim()}
      style={{ "--k-icon-size": `${size}px` } as CSSProperties}
    >
      <path d="M8 9.5 12 5.5l4 4M8 14.5l4 4 4-4" />
    </svg>
  );
}

/** The grown-up's mark where a learner's avatar would be. */
function GrownUpMark({ big = false }: { big?: boolean }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full border border-border bg-panel2 text-ink ${big ? "size-8" : "size-7"}`}>
      <IconGrownUp size={big ? 17 : 15} />
    </span>
  );
}

/** Who is using the app now. */
function useWho() {
  const t = useT();
  const locale = useLocale();
  const learner = useStore(currentLearner);
  const account = useStore(currentAccount);
  return {
    learner,
    name: learner?.nickname ?? account?.displayName ?? "",
    detail: learner ? gradeLabel(locale, learner.grade) : t("profiles.parent"),
    mark: learner ? <Avatar profile={learner} size="sm" /> : <GrownUpMark big />,
  };
}

/** Opens the switcher. `rail`: the full row in the rail's footer. `bar`: the compact pill in the phone header. */
export function WhoButton({ variant, open }: { variant: "rail" | "bar"; open: boolean }) {
  const t = useT();
  const who = useWho();
  const common = {
    type: "button" as const,
    popoverTarget: SWITCHER_ID,
    "aria-haspopup": "dialog" as const,
    "aria-expanded": open,
  };
  if (variant === "bar")
    return (
      <button
        {...common}
        className="k-btn-secondary min-h-target min-w-0 gap-1.5 rounded-full py-1 pr-2.5 pl-1 aria-expanded:border-border-strong aria-expanded:bg-panel2"
      >
        {who.mark}
        <span className="min-w-0 truncate text-sm font-medium text-ink max-[22.5rem]:sr-only">{who.name}</span>
        <VisuallyHidden>, {t("nav.switch")}</VisuallyHidden>
        <IconSelector size={16} className="shrink-0 text-muted" />
      </button>
    );
  return (
    <button
      {...common}
      className="k-who-anchor group flex min-h-target min-w-0 flex-1 items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-(--duration-quick) hover:bg-panel/60 active:bg-panel/90 aria-expanded:bg-panel aria-expanded:shadow-soft"
    >
      {who.mark}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium text-ink">{who.name}</span>
        <span className="block truncate text-xs text-muted">{who.detail}</span>
      </span>
      <VisuallyHidden>, {t("nav.switch")}</VisuallyHidden>
      <IconSelector size={16} className="shrink-0 text-muted transition-colors group-hover:text-ink" />
    </button>
  );
}

const pair = () => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)] as const;

/** The grown-up question, inline in the switcher (same check as the profiles page's ParentGate). */
function GrownUpCheck({ titleId, onPass, onBack }: { titleId: string; onPass: () => void; onBack: () => void }) {
  const t = useT();
  const [[a, b], setPair] = useState(pair);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <form
      className="k-enter space-y-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(answer) === a * b) {
          unlockParent();
          onPass();
          return;
        }
        setWrong(true);
        setAnswer("");
        setPair(pair());
        announce(t("gate.wrong"), { assertive: true });
      }}
    >
      <div className="flex items-start gap-1">
        <IconButton label={t("common.back")} icon={<IconArrowLeft size={18} />} size="sm" onClick={onBack} className="-ml-1.5" />
        <div className="min-w-0 pt-1">
          <h2 id={titleId} className="font-brand text-t3 font-semibold text-ink">
            {t("gate.title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t("gate.why")}</p>
        </div>
      </div>
      <Field label={t("gate.question", { a, b })} error={wrong ? t("gate.wrong") : undefined}>
        {(aria) => (
          <input
            {...aria}
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="go"
            className="k-input font-opmono"
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        )}
      </Field>
      <Button type="submit" disabled={!answer} className="w-full">
        {t("gate.continue")}
      </Button>
    </form>
  );
}

function Item({ current, onClick, href, children }: { current?: boolean; onClick?: () => void; href?: string; children: ReactNode }) {
  const cls =
    "flex min-h-target w-full items-center gap-3 rounded-sm px-2.5 py-1.5 text-left text-sm text-ink transition-colors duration-(--duration-quick) hover:bg-panel2 active:bg-border/60 aria-[current=true]:bg-panel2/70";
  return href ? (
    <Link href={href} data-k-item onClick={onClick} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" data-k-item aria-current={current ? "true" : undefined} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** Up/Down (and Home/End) move between the switcher's choices. */
function arrows(e: KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) || (e.target as HTMLElement).closest("input")) return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-k-item]")];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const step = e.key === "ArrowDown" ? 1 : -1;
  const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (at + step + items.length) % items.length;
  e.preventDefault();
  items[next]?.focus();
}

/** Everything beside the switcher in the shell, made inert (or live again). */
function holdPage(el: HTMLElement | null, hold: boolean) {
  for (const sib of Array.from(el?.parentElement?.children ?? [])) if (sib !== el) (sib as HTMLElement).inert = hold;
}

/** The switcher itself. `status` is shown at its foot on phones (the rail shows it on wide screens).
 *  Phones: a bottom sheet over a dimmed page, so it is modal: the page behind is inert until it closes.
 *  Wide screens: a light panel by the rail that closes when focus moves on past it. */
export function Switcher({ status, onOpenChange }: { status: ReactNode; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"choose" | "check">("choose");
  const [modal, setModal] = useState(false);
  useEffect(() => {
    const el = ref.current;
    return () => holdPage(el, false);
  }, []);
  const kids = useStore(learnersOf);
  const learner = useStore(currentLearner);
  const unlocked = useStore((s) => Boolean(s.session.unlocked));
  const now = learner?.id ?? "parent";

  const go = (id: string) => {
    ref.current?.hidePopover();
    if (id === now) return;
    selectLearner(id);
    const kid = kids.find((k) => k.id === id);
    announce(kid ? t("shell.switched", { name: kid.nickname }) : t("shell.toParent"));
    router.push(kid ? "/home" : "/family");
  };

  return (
    <div
      ref={ref}
      id={SWITCHER_ID}
      popover="auto"
      role="dialog"
      aria-modal={modal || undefined}
      aria-labelledby={titleId}
      data-k-chrome
      className="k-switcher"
      onKeyDown={arrows}
      onBlur={(e) => {
        // Wide screens: Tab past the last choice (or a click elsewhere that takes focus) closes it.
        const to = e.relatedTarget as Element | null;
        if (modal || !to || ref.current?.contains(to) || to.closest(`[popovertarget="${SWITCHER_ID}"]`)) return;
        ref.current?.hidePopover();
      }}
      // Before it closes, the page is live again, so focus can go back to the button that opened it.
      onBeforeToggle={(e) => {
        if (e.newState === "closed") holdPage(ref.current, false);
      }}
      onToggle={(e) => {
        const open = e.newState === "open";
        const sheet = open && window.matchMedia("(width < 64rem)").matches;
        setModal(sheet);
        if (sheet) holdPage(ref.current, true);
        onOpenChange(open);
        if (open) ref.current?.querySelector<HTMLElement>("[aria-current=true], [data-k-item]")?.focus();
        else setStep("choose");
      }}
    >
      {step === "check" ? (
        <GrownUpCheck titleId={titleId} onPass={() => go("parent")} onBack={() => setStep("choose")} />
      ) : (
        <div className="p-2 pt-1">
          <h2 id={titleId} className="px-2.5 pt-3 pb-2 font-brand text-t3 font-semibold text-ink">
            {t("profiles.title")}
          </h2>
          <ul className="space-y-0.5">
            {kids.map((kid) => (
              <li key={kid.id}>
                <Item current={kid.id === now} onClick={() => go(kid.id)}>
                  <Avatar profile={kid} size="sm" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate font-medium">{kid.nickname}</span>
                    <span className="block truncate text-xs text-muted">{gradeLabel(locale, kid.grade)}</span>
                  </span>
                  {kid.id === now && <IconCheck size={18} className="k-draw text-accent" />}
                </Item>
              </li>
            ))}
            <li>
              <Item current={now === "parent"} onClick={() => (unlocked || now === "parent" ? go("parent") : setStep("check"))}>
                <GrownUpMark big />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate font-medium">{t("profiles.parent")}</span>
                  <span className="block truncate text-xs text-muted">{t("profiles.parentHint")}</span>
                </span>
                {now === "parent" ? (
                  <IconCheck size={18} className="k-draw text-accent" />
                ) : (
                  !unlocked && (
                    <span className="text-muted">
                      <IconLock size={16} />
                      <VisuallyHidden>{t("shell.locked")}</VisuallyHidden>
                    </span>
                  )
                )}
              </Item>
            </li>
          </ul>
          <div aria-hidden="true" className="mx-2.5 my-2 h-px bg-border" />
          <Item href="/profiles" onClick={() => ref.current?.hidePopover()}>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-border-strong text-muted">
              <IconPlus size={16} />
            </span>
            <span className="min-w-0 flex-1 font-medium">{t("shell.manage")}</span>
          </Item>
          <div className="mt-2 border-t border-border px-2.5 pt-3 pb-1 lg:hidden">{status}</div>
          <Item onClick={signOut}>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center text-muted">
              <IconLogout size={18} />
            </span>
            <span className="min-w-0 flex-1 text-muted">{t("nav.signOut")}</span>
          </Item>
        </div>
      )}
    </div>
  );
}
