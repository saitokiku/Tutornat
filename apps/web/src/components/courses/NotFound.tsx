"use client";

import Link from "next/link";
import { EmptyState, btn } from "@/components/ui";
import { useT } from "@/i18n";

export function NotFound() {
  const t = useT();
  return (
    <EmptyState
      title={t("common.notFound.title")}
      body={t("common.notFound.body")}
      action={
        <Link href="/home" className={btn("secondary")}>
          {t("common.goHome")}
        </Link>
      }
    />
  );
}
