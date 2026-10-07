import { isBackchannel } from "./backchannel";
import { BARGE_IN_MS, echoVerdict, shouldBargeIn } from "./bargein";
import { sentencesFrom } from "./chunk";
import type { SpeakSource, SpeechIn, SpeechOut, Unsubscribe } from "./types";

// Talking with the tutor, both ways at once. While the tutor speaks the microphone stays open:
//  - "mhm", "ok", "ajá", "sí" are let through: no interruption, no new turn, the tutor goes on;
//  - real speech for 300 ms or more stops the tutor at once (barge-in) and becomes the next turn;
//  - the tutor's own voice picked up by the microphone is ignored.
// When the tutor is quiet, every finished turn (even "ok") goes to onTurn.

export type ConverseOptions = {
  input: SpeechIn | null;
  output: SpeechOut | null;
  /** The learner said something to answer. */
  onTurn: (text: string) => void;
  /** The learner interrupted; the tutor's speech was cancelled. */
  onBargeIn?: () => void;
  /** An acknowledgement while the tutor was speaking (kept out of the conversation). */
  onBackchannel?: (text: string) => void;
  minBargeMs?: number;
  now?: () => number;
};

export function converse({ input, output, onTurn, onBargeIn, onBackchannel, minBargeMs = BARGE_IN_MS, now = () => Date.now() }: ConverseOptions) {
  let onsetAt: number | null = null;
  let heard = "";
  let recent: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subs: Unsubscribe[] = [];

  const speaking = () => output?.state === "speaking" || output?.state === "paused";

  function check() {
    clearTimeout(timer);
    if (!output || !speaking() || onsetAt == null || !heard) return;
    if (shouldBargeIn({ speaking: true, heard, onsetAt, now: now(), tutorRecent: recent.join(" "), minMs: minBargeMs })) {
      output.cancel();
      onBargeIn?.();
      return;
    }
    // Real words but not long enough yet: look again when they would be.
    const left = onsetAt + minBargeMs - now();
    if (left > 0) timer = setTimeout(check, left);
  }

  if (input) {
    subs.push(
      input.onSpeechStart(() => {
        onsetAt ??= now();
      }),
      input.onPartial((text) => {
        onsetAt ??= now();
        heard = text;
        check();
      }),
      input.onEndOfTurn((text) => {
        const wasSpeaking = speaking();
        clearTimeout(timer);
        onsetAt = null;
        heard = "";
        if (wasSpeaking && isBackchannel(text)) return onBackchannel?.(text);
        if (wasSpeaking && echoVerdict(text, recent.join(" ")) === "echo") return;
        if (output && output.state !== "idle") output.cancel();
        onTurn(text);
      }),
    );
  }

  return {
    /** Speak through the output, remembering the words so their echo isn't taken for the learner. */
    say(source: SpeakSource): Promise<void> {
      if (!output) return Promise.resolve();
      recent = [];
      const tap = async function* () {
        for await (const s of sentencesFrom(source)) {
          recent = [...recent, ...s.split(/\s+/)].slice(-60);
          yield s;
        }
      };
      return output.speak(tap());
    },
    dispose() {
      clearTimeout(timer);
      subs.forEach((u) => u());
      subs.length = 0;
    },
  };
}
