"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";

/**
 * Adds a photo of the problem. On a phone it offers the camera or the photo library; with a mouse it
 * opens the file chooser. Nothing is read until the learner picks a picture.
 */
export function PhotoButton({ onFile, disabled, big = false }: { onFile: (file: File) => void; disabled?: boolean; big?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  }, [open]);

  const picked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setOpen(false);
    if (file) onFile(file);
  };
  const size = big ? "size-14" : "size-11";

  return (
    <div className="relative shrink-0">
      <button
        ref={toggle}
        type="button"
        disabled={disabled}
        aria-label={t("tut.photo.add")}
        aria-expanded={open}
        onClick={() => {
          // A phone gets the choice of camera or library; elsewhere the chooser opens straight away.
          if (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches) setOpen(!open);
          else library.current?.click();
        }}
        className={`grid ${size} place-items-center rounded-full border border-border bg-panel text-ink hover:bg-panel2 disabled:opacity-40`}
      >
        <CameraIcon />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 flex w-52 flex-col gap-1 rounded-md border border-border bg-panel p-1.5 shadow-lift">
          <button ref={first} type="button" onClick={() => camera.current?.click()} className="min-h-11 rounded-sm px-3 text-left text-sm text-ink hover:bg-panel2">
            {t("tut.photo.take")}
          </button>
          <button type="button" onClick={() => library.current?.click()} className="min-h-11 rounded-sm px-3 text-left text-sm text-ink hover:bg-panel2">
            {t("tut.photo.choose")}
          </button>
        </div>
      )}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={picked} aria-label={t("tut.photo.take")} />
      <input ref={library} type="file" accept="image/*" hidden onChange={picked} aria-label={t("tut.photo.choose")} data-testid="tutor-photo" />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4z" />
      <circle cx="12" cy="13.2" r="3.2" />
    </svg>
  );
}
