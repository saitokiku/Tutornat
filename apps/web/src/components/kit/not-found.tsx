"use client";

import Link from "next/link";
import { KaizenMark } from "@/components/brand";
import { useTitle } from "@/components/LangSync";
import { useT } from "@/i18n";
import { btn } from "./btn";

/** The 404 body: renders English on the server, then the family's language once the browser store is read. */
export function NotFoundBody() {
  const t = useT();
  useTitle(t("ds.notFound.docTitle"));
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-5 py-16 text-center">
      <KaizenMark size={64} grow />
      <h1 className="mt-6 font-brand text-t1 font-semibold text-ink">{t("ds.notFound.title")}</h1>
      <p className="mt-2 max-w-[36ch] text-sm text-muted">{t("ds.notFound.body")}</p>
      <Link href="/" className={btn("primary", "md", "mt-8")}>
        {t("ds.notFound.home")}
      </Link>
    </main>
  );
}
