"use client";

import { useEffect } from "react";
import { useLocale } from "@/i18n";

/** Keeps <html lang> in step with the language on screen, so screen readers use the right voice. */
export function LangSync() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

/** Sets the tab title (and what Next's route announcer reads) for a page. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · KaizenEDU` : "KaizenEDU";
  }, [title]);
}
