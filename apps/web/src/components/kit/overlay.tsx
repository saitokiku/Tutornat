"use client";

// Dialog and Sheet on the native <dialog>. showModal() gives the platform focus trap, an inert page and
// the top layer (no portal, no clipping). We add: Escape and backdrop dismissal routed through onClose so
// React stays the source of truth, focus on the title when nothing asks for autofocus, and focus returned
// to whatever opened it. A modal is for a task that needs protected focus; prefer inline UI otherwise.
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconX } from "@/components/icons";
import { useT } from "@/i18n";
import { IconButton } from "./display";

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Actions, right-aligned under a hairline. One ink primary at most. */
  footer?: ReactNode;
  /** Escape, the close button and a backdrop tap close it. Turn off only for a choice that must be made. */
  dismissible?: boolean;
  className?: string;
};

function Overlay({ open, onClose, title, description, children, footer, dismissible = true, className = "", kind }: OverlayProps & { kind: "dialog" | "sheet" }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const downOnBackdrop = useRef(false);
  const id = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof d.showModal === "function") d.showModal();
      else d.setAttribute("open", "");
      if (!d.querySelector("[autofocus]")) d.querySelector<HTMLElement>("[data-dialog-title]")?.focus();
    } else if (!open && d.open) {
      if (typeof d.close === "function") d.close();
      else d.removeAttribute("open");
      const back = opener.current;
      opener.current = null;
      if (back?.isConnected) back.focus();
    }
  }, [open]);

  const dismiss = () => {
    if (dismissible) onCloseRef.current();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      className={`${kind === "sheet" ? "k-sheet" : "k-dialog"} ${className}`.trim()}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }}
      // Android back and other close requests arrive as cancel; keep the dialog open until React closes it.
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      // If the browser closed it anyway, tell React.
      onClose={() => {
        if (open) onCloseRef.current();
      }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) dismiss();
        downOnBackdrop.current = false;
      }}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <header className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0 flex-1 pt-1">
            <h2 id={`${id}-title`} data-dialog-title tabIndex={-1} className="font-brand text-t2 font-semibold text-ink outline-none">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && <IconButton label={t("common.close")} icon={<IconX size={20} />} onClick={dismiss} className="-mt-1.5 -mr-2.5" />}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">{footer}</footer>}
      </div>
    </dialog>
  );
}

/** A centred modal for a short task that needs protected focus (confirm a plan change, name a course). */
export function Dialog(props: OverlayProps) {
  return <Overlay {...props} kind="dialog" />;
}

/** A sheet: from the bottom on phones, an inset panel on the right on wider screens. For a side task
 *  next to the work (the tutor beside a problem, filters, an item's details). */
export function Sheet(props: OverlayProps) {
  return <Overlay {...props} kind="sheet" />;
}
