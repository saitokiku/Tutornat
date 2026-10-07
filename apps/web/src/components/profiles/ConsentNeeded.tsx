"use client";

import Link from "next/link";
import { useState } from "react";
import { IconSpeaker } from "@/components/icons";
import { speakText } from "@/components/stage/hear";
import { btn, Notice } from "@/components/ui";
import { useLocale, useT } from "@/i18n";
import { useConsent } from "@/lib/auth";
import { useStore } from "@/lib/store";

/**
 * For the tutor, AI-written practice and the microphone: when a learner's consent doesn't cover
 * `scope`, says so. Renders nothing when allowed, which is always the case in the browser-only version.
 *
 *   <ConsentNeeded profileId={learner.id} scope="ai" />                     a learner's screen
 *   <ConsentNeeded profileId={child.id} scope="voice" audience="parent" />  a grown-up's screen
 *
 * A learner sees one plain sentence, with a button that reads it aloud for K–2 (no link: the consent
 * page is the grown-up's, behind their gate). A grown-up gets a link to the consent page.
 */
export function ConsentNeeded({ profileId, scope, audience = "learner" }: { profileId: string; scope: "ai" | "voice"; audience?: "learner" | "parent" }) {
  const t = useT();
  const locale = useLocale();
  const gate = useConsent(profileId);
  const learner = useStore((s) => s.profiles.find((p) => p.id === profileId));
  const [speaking, setSpeaking] = useState(false);
  if (gate[scope] || !learner) return null;
  if (audience === "parent")
    return (
      <Notice
        action={
          <Link href="/consent" className={btn("secondary")}>
            {t("acct.consent.review")}
          </Link>
        }
      >
        {t(scope === "ai" ? "acct.consent.neededAiParent" : "acct.consent.neededVoiceParent", { name: learner.nickname })}
      </Notice>
    );
  // The sentence names nobody, so reading it aloud sends no name to the device's voice.
  const text = t(scope === "ai" ? "acct.consent.learnerAi" : "acct.consent.learnerVoice");
  const young = learner.grade === "K" || learner.grade === "1" || learner.grade === "2";
  return (
    <Notice
      action={
        young && (
          <button
            type="button"
            aria-label={`${t("stage.readAloud")}: ${text}`}
            aria-pressed={speaking}
            onClick={() => speakText(text, locale, () => setSpeaking(false)) && setSpeaking(true)}
            className="grid size-14 shrink-0 place-items-center rounded-full border border-border bg-panel text-ink hover:border-ink/30"
          >
            <IconSpeaker size={22} />
          </button>
        )
      }
    >
      {text}
    </Notice>
  );
}
