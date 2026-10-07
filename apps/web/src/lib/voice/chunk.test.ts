import { describe, expect, it } from "vitest";
import { createChunker, sentenceFeed, sentencesOf, splitSentences } from "./chunk";
import { countWords } from "./types";

/** Streams the text through the chunker in pieces of `size` characters. */
function streamed(text: string, size: number) {
  const c = createChunker();
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(...c.push(text.slice(i, i + size)));
  out.push(...c.end());
  return out;
}

const CASES: [string, string[]][] = [
  ["Hi there. How are you?", ["Hi there.", "How are you?"]],
  ["Mr. Smith has 3.5 apples. Dr. Lee has 2.", ["Mr. Smith has 3.5 apples.", "Dr. Lee has 2."]],
  ["Hmm... let me think. Okay, look at the top number.", ["Hmm... let me think.", "Okay, look at the top number."]],
  ["Wait… Look again.", ["Wait…", "Look again."]],
  ["¿Cuántos hay? ¡Cuenta otra vez! Sigue con el siguiente.", ["¿Cuántos hay?", "¡Cuenta otra vez!", "Sigue con el siguiente."]],
  ["El Sr. García pesa 2,5 kg. La Sra. Ruiz llega a las 3 p.m. hoy.", ["El Sr. García pesa 2,5 kg.", "La Sra. Ruiz llega a las 3 p.m. hoy."]],
  ["Some fruits, e.g. Apples, grow on trees. Others don't.", ["Some fruits, e.g. Apples, grow on trees.", "Others don't."]],
  ["J. K. Rowling wrote it. Read chapter 2.", ["J. K. Rowling wrote it.", "Read chapter 2."]],
  ["1. Add the ones.\n2. Add the tens.", ["1. Add the ones.", "2. Add the tens."]],
  ['He said "Stop." Then he left.', ['He said "Stop."', "Then he left."]],
  ['"Really?" she asked. Yes.', ['"Really?" she asked.', "Yes."]],
  ["It costs $3. Then you get change.", ["It costs $3.", "Then you get change."]],
  ["Pi is about 3.14. That's close.", ["Pi is about 3.14.", "That's close."]],
  ["I said no. Then I left.", ["I said no.", "Then I left."]],
  ["See fig. 3 on p. 12. It shows it.", ["See fig. 3 on p. 12.", "It shows it."]],
  ["Look at the picture (the red one). Count the parts.", ["Look at the picture (the red one).", "Count the parts."]],
  ["Line one\nLine two\n\nLine three", ["Line one", "Line two", "Line three"]],
  ["What is 7 × 8?Think about 7 × 4 first.", ["What is 7 × 8?Think about 7 × 4 first."]],
  ["Your test is on Oct. 12. Study the first page tonight.", ["Your test is on Oct. 12.", "Study the first page tonight."]],
  ["La prueba es el 3 dic. 2026. Repasa hoy.", ["La prueba es el 3 dic. 2026.", "Repasa hoy."]],
  ["Mira el ej. 3 en la pág. 12. Luego sigue.", ["Mira el ej. 3 en la pág. 12.", "Luego sigue."]],
  ["Vamos al mar. Luego comemos.", ["Vamos al mar.", "Luego comemos."]],
  ["Bring pens, paper, etc. We start at nine.", ["Bring pens, paper, etc. We start at nine."]],
];

describe("sentence chunker", () => {
  it.each(CASES)("splits %j", (text, expected) => {
    expect(splitSentences(text)).toEqual(expected);
  });

  it("gives the same sentences however the text is streamed", () => {
    for (const [text, expected] of CASES) for (const size of [1, 2, 3, 7, 50]) expect(streamed(text, size), `${text} @${size}`).toEqual(expected);
  });

  it("keeps every word: word indexes over sentences match the whole text", () => {
    for (const [text] of CASES) expect(splitSentences(text).reduce((n, s) => n + countWords(s), 0)).toBe(countWords(text));
  });

  it("waits on a period at the end of the stream (it may be a decimal or an abbreviation)", () => {
    const c = createChunker();
    expect(c.push("The answer is 3.")).toEqual([]);
    expect(c.push("14 exactly. ")).toEqual([]);
    expect(c.push("Next")).toEqual(["The answer is 3.14 exactly."]);
    expect(c.end()).toEqual(["Next"]);
  });

  it("releases a sentence as soon as the next one starts, or at a newline", () => {
    const c = createChunker();
    expect(c.push("Done. ")).toEqual([]);
    expect(c.push("N")).toEqual(["Done."]);
    const d = createChunker();
    expect(d.push("Done.\n")).toEqual(["Done."]);
  });

  it("does not split mid-thought on lowercase after a period", () => {
    expect(splitSentences("We need approx. five more.")).toEqual(["We need approx. five more."]);
  });

  it("speaks a long first sentence in clause-sized parts so audio starts sooner", () => {
    const text = "When you add fractions with the same bottom number, you keep the bottom number the same and add only the top numbers together, which is the part that changes.";
    const parts = splitSentences(text);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]).toBe("When you add fractions with the same bottom number,");
    expect(parts.join(" ")).toBe(text);
  });

  it("cuts a run-on sentence at a space when there is no clause mark", () => {
    const text = `${"word ".repeat(60)}end.`;
    const parts = splitSentences(text, { maxChars: 100, firstMaxChars: 100 });
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(100);
    expect(parts.join(" ")).toBe(text);
  });
});

describe("sentence feed", () => {
  it("turns a growing reply into sentences, once each", async () => {
    const feed = sentenceFeed();
    feed.set("Let's look");
    feed.set("Let's look at it. What do");
    feed.set("Let's look at it. What do you see?");
    feed.set("Let's look at it. What do you see? Tell me.");
    feed.end();
    const got: string[] = [];
    for await (const s of feed.sentences) got.push(s);
    expect(got).toEqual(["Let's look at it.", "What do you see?", "Tell me."]);
  });

  it("hands out sentences before the reply ends", async () => {
    const feed = sentenceFeed();
    const it = feed.sentences[Symbol.asyncIterator]();
    feed.write("One. Two");
    expect((await it.next()).value).toBe("One.");
    feed.end();
    expect((await it.next()).value).toBe("Two");
    expect((await it.next()).done).toBe(true);
  });

  it("abort drops what is left", async () => {
    const feed = sentenceFeed();
    feed.write("Half a sent");
    feed.abort();
    const got: string[] = [];
    for await (const s of feed.sentences) got.push(s);
    expect(got).toEqual([]);
  });

  it("sentencesOf turns a stream of deltas into sentences", async () => {
    async function* deltas() {
      yield "Fir";
      yield "st. Sec";
      yield "ond.";
    }
    const got: string[] = [];
    for await (const s of sentencesOf(deltas())) got.push(s);
    expect(got).toEqual(["First.", "Second."]);
  });
});
