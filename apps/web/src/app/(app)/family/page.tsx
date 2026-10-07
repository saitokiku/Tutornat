"use client";

import Link from "next/link";
import { useState } from "react";
import { FamilyCard } from "@/components/family/FamilyCard";
import { HandoverScope } from "@/components/family/Handover";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { EmptyState, btn } from "@/components/ui";
import { useT } from "@/i18n";
import { learnersOf } from "@/lib/profiles";
import { useStore } from "@/lib/store";

export default function FamilyPage() {
  // The cards hand the device to a child; the scope keeps the grown-ups-only Guard from redirecting
  // that hand-over to Today before it reaches the page the link points at.
  return (
    <HandoverScope>
      <Guard need="parent">
        <Family />
      </Guard>
    </HandoverScope>
  );
}

function Family() {
  const t = useT();
  useTitle(t("family.title"));
  const kids = useStore(learnersOf);
  const [now] = useState(() => Date.now());
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("family.title")}</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">{t("fam.intro")}</p>
      </div>
      {kids.length === 0 ? (
        <EmptyState
          title={t("family.empty")}
          action={
            <Link href="/profiles" className={btn("secondary")}>
              {t("profiles.add")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {kids.map((k) => (
            <FamilyCard key={k.id} child={k} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
