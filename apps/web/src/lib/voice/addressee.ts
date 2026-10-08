import { fold } from "./speakable";

// Talking to someone else (live tutor spec §2.4): "Mom, can I have a snack?" is not a turn for the
// tutor. A turn whose first word calls a grown-up, or a sibling by the nickname in the family's
// profiles, waits behind "Send to the tutor?". The match happens on the device; the nickname is
// never sent anywhere.

const CALLS = ["mom", "mommy", "mama", "mum", "dad", "daddy", "papa", "grandma", "grandpa", "abuela", "abuelo", "mamá", "mami", "papá", "papi", "tía", "tío"].map(fold);

/** The first word of `text`, folded (no case, no accents, no punctuation). */
const firstWord = (text: string) => fold(text.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}\p{N}]+/gu, "");

/** Does this turn start by calling someone in the room? `siblings`: the other learners' nicknames on this device. */
export function addressesSomeoneElse(text: string, siblings: string[] = []): boolean {
  const w = firstWord(text);
  if (!w) return false;
  if (CALLS.includes(w)) return true;
  return siblings.some((n) => {
    const first = fold(n.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}\p{N}]+/gu, "");
    return first.length > 1 && first === w;
  });
}
