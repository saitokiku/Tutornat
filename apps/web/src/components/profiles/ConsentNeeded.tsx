"use client";

import Link from "next/link";
import { btn, Notice } from "@/components/ui";
import { useT } from "@/i18n";
import { useConsent } from "@/lib/auth";
import { useStore } from "@/lib/store";

/**
 * For the tutor and the microphone: when a learner's consent doesn't cover `scope`, says so and
 * points a grown-up to the consent page (behind the grown-up gate). Renders nothing when allowed,
 * which is always the case in the browser-only version.
 *
 *   <ConsentNeeded profileId={learner.id} scope="ai" />
 */
export function ConsentNeeded({ profileId, scope }: { profileId: string; scope: "ai" | "voice" }) {
  const t = useT();
  const gate = useConsent(profileId);
  const name = useStore((s) => s.profiles.find((p) => p.id === profileId)?.nickname ?? "");
  if (gate[scope]) return null;
  return (
    <Notice
      action={
        <Link href="/consent" className={btn("secondary")}>
          {t("acct.consent.ask")}
        </Link>
      }
    >
      {t(scope === "ai" ? "acct.consent.neededAi" : "acct.consent.neededVoice", { name })}
    </Notice>
  );
}
