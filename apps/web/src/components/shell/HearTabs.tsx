"use client";

// K–2: one speaker that names every tab in order, lighting each one as it is said, so a child who
// can't read yet learns what the pictures mean. Sound only when tapped; tap again to stop.
import { useEffect, useRef, useState } from "react";
import { IconSpeaker } from "@/components/icons";
import { speakText } from "@/components/stage/hear";
import { IconButton } from "@/components/ui";
import { useLocale, useT } from "@/i18n";

export function HearTabs({ labels, onSpeak }: { labels: string[]; onSpeak: (i: number | null) => void }) {
  const t = useT();
  const locale = useLocale();
  const [on, setOn] = useState(false);
  const run = useRef(0); // each reading gets a number; stopping moves it on, so a stale chain ends itself
  const live = useRef(false);
  const report = useRef(onSpeak);
  useEffect(() => {
    report.current = onSpeak;
  });
  useEffect(
    () => () => {
      run.current++;
      if (live.current) speechSynthesis.cancel();
    },
    [],
  );
  if (!("speechSynthesis" in window)) return null;

  const stop = () => {
    run.current++;
    live.current = false;
    speechSynthesis.cancel();
    setOn(false);
    report.current(null);
  };
  const say = (id: number, i: number) => {
    if (run.current !== id) return;
    if (i >= labels.length) return stop();
    report.current(i);
    if (!speakText(labels[i], locale, () => say(id, i + 1))) stop();
  };

  return (
    <IconButton
      label={t("shell.hearTabs")}
      aria-pressed={on}
      icon={<IconSpeaker size={22} />}
      variant="secondary"
      onClick={() => {
        if (on) return stop();
        live.current = true;
        setOn(true);
        say(++run.current, 0);
      }}
    />
  );
}
