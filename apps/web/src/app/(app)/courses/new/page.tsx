"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Guard } from "@/components/gate";
import { useTitle } from "@/components/LangSync";
import { IconArrowLeft } from "@/components/icons";
import { MagicBox } from "@/components/magic-box/MagicBox";
import { useT } from "@/i18n";
import { currentLearner } from "@/lib/profiles";
import { useStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

export default function NewCoursePage() {
  return (
    <Guard need="learner">
      <NewCourse />
    </Guard>
  );
}

function NewCourse() {
  const t = useT();
  useTitle(t("nav.new"));
  const learner = useStore(currentLearner) as Profile;
  const goal = useSearchParams().get("goal") ?? "";
  // Next keeps this page mounted, hidden, and shows it again when it is navigated to. A fresh visit
  // ("New course", Today's box, "Change my request") gets a fresh box filled from ?goal; Back and
  // Forward keep the box as it was left.
  const { bfcacheId } = useRouter();
  return (
    <div className="space-y-6">
      <Link href="/home" className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted hover:bg-panel2 hover:text-ink">
        <IconArrowLeft size={16} /> {t("nav.home")}
      </Link>
      <h1 className="font-brand text-t1 font-semibold text-ink sm:text-d3">{t("nav.new")}</h1>
      <MagicBox key={bfcacheId} learner={learner} variant="page" initialGoal={goal.slice(0, 2000)} />
    </div>
  );
}
