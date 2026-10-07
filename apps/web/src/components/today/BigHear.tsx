"use client";

import { Hear, useHear } from "@/components/stage/hear";

/**
 * Read-aloud on Today. For K–2 (young read-aloud on) the button is a 56px target, the size of their other
 * primary controls; the stage's own speaker is 40px. Renders nothing when read-aloud is off.
 */
export function BigHear({ text }: { text: string }) {
  const { young } = useHear();
  return <Hear text={text} className={young ? "size-14!" : ""} />;
}
