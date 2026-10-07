import { describe, expect, it } from "vitest";
import { answerText, check, misconceptionOf } from "@/practice/answer";
import { makeItem, SKILLS } from "@/practice/skills";
import type { Item } from "@/practice/types";
import { counterCell, isMarkable, layoutCounters } from "./MarkCounters";
import { clockText, linePoints, pointOf, stepHour, stepMinute } from "./pad-math";

// The skills that answer on a touch pad, checked by a different route than their generators: every
// position the pad can produce is tried, and exactly the ones that match the prompt must check right.

const SEEDS = Array.from({ length: 200 }, (_, i) => i * 7919 + 101);
/** The room the Runner gives counters on a 320 px phone: the page gutters off, the card's padding used. */
const PHONE_ROOM = 320 - 2 * 16 - 2;
const LOCALES = ["en", "es"] as const;
const items = (id: string, level: number, locale: "en" | "es" = "en") => SEEDS.map((seed) => makeItem(id, level, seed, locale));
const fracIn = (it: Item) => {
  const f = it.prompt.find((p): p is { frac: [number, number] } => typeof p === "object" && "frac" in p);
  if (!f) throw new Error("no fraction in the prompt");
  return f.frac.map(Number) as [number, number];
};
const text = (it: Item) => it.prompt.filter((p): p is string => typeof p === "string").join("");

describe("which skills use which input", () => {
  it("K counting and K–1 pictures are markable; every markable item has a markable picture", () => {
    for (const id of ["m.count.10", "m.count.20", "m.add.5", "m.sub.5", "m.make.10"])
      for (const it of items(id, 1)) expect(it.markable, id).toBe(true);
    for (const s of SKILLS)
      for (let level = 1; level <= s.levels; level++)
        for (const it of items(s.id, level).slice(0, 30)) if (it.markable) expect(isMarkable(it.visual), `${s.id} L${level}`).toBe(true);
  });

  it("every touch-pad item carries settings for its pad", () => {
    for (const s of SKILLS)
      for (let level = 1; level <= s.levels; level++)
        for (const it of items(s.id, level).slice(0, 40))
          if (it.input === "number-line" || it.input === "fraction-bar" || it.input === "clock") expect(it.pad?.kind, `${s.id} L${level}`).toBe(it.input);
  });
});

describe("tap-to-mark counting", () => {
  it("m.count.10 and m.count.20: the counters you can mark are exactly the answer", () => {
    for (const id of ["m.count.10", "m.count.20"])
      for (const level of [1, 2])
        for (const it of items(id, level)) {
          if (!isMarkable(it.visual) || it.answer.kind !== "choice") throw new Error(`${id} shape`);
          const counters = layoutCounters(it.visual, PHONE_ROOM, counterCell(true)).counters;
          const counted = counters.filter((c) => !c.crossed && c.filled).length;
          expect(String(counted)).toBe(it.choices![it.answer.index].label);
        }
  });

  it("m.sub.5: the counters left after the crossed ones are the answer", () => {
    for (const it of items("m.sub.5", 1)) {
      if (it.visual?.kind !== "dots" || it.answer.kind !== "choice") throw new Error("shape");
      const left = layoutCounters(it.visual, PHONE_ROOM, counterCell(true)).counters.filter((c) => !c.crossed).length;
      expect(String(left)).toBe(it.choices![it.answer.index].label);
    }
  });

  it("every K–1 counter is a 56 px target on a 320 px phone, and the picture fits", () => {
    for (const id of ["m.count.10", "m.count.20", "m.add.5", "m.sub.5", "m.make.10", "m.compare.10", "m.add.10", "m.sub.10"])
      for (const level of [1, 2])
        for (const it of items(id, level).slice(0, 80))
          if (it.markable && isMarkable(it.visual)) {
            const lay = layoutCounters(it.visual, PHONE_ROOM, counterCell(true));
            expect(lay.cell, id).toBe(56);
            expect(lay.width, id).toBeLessThanOrEqual(PHONE_ROOM);
          }
  });
});

describe("m.time.clock: set the hands", () => {
  it("the time in the prompt is the only setting the pad accepts, at every level", () => {
    let seen = 0;
    for (const level of [1, 2, 3])
      for (const locale of LOCALES)
        for (const it of items("m.time.clock", level, locale)) {
          if (it.input !== "clock") continue;
          seen++;
          const [, h, m] = /(\d{1,2}):(\d{2})/.exec(text(it))!.map(Number);
          const step = it.pad?.kind === "clock" ? it.pad.stepMinutes : 0;
          expect(step).toBe(level === 1 ? 60 : level === 2 ? 30 : 5);
          // Walk every setting the pad can reach (12 hours × the step's minutes).
          const right: string[] = [];
          for (let hh = 1, k = 0; k < 12; k++, hh = stepHour(hh, 1))
            for (let mm = 0, j = 0; j < 60 / Math.min(step, 60); j++, mm = stepMinute(mm, 1, step))
              if (check(it.answer, clockText(hh, mm)).correct) right.push(clockText(hh, mm));
          expect(right).toEqual([clockText(h, m)]);
          expect(check(it.answer, `0${h}:${String(m).padStart(2, "0")}`).correct).toBe(true);
          expect(answerText(it.answer)).toBe(clockText(h, m));
          // Every set-the-clock problem names its likely slips, each one a setting the pad can make.
          expect(it.wrong?.length, `${h}:${m} L${level}`).toBeGreaterThanOrEqual(2);
          for (const w of it.wrong ?? []) {
            expect(check(it.answer, w.value).correct).toBe(false);
            expect(misconceptionOf(it, w.value)).toBe(w.why);
            const [wh, wm] = w.value.split(":").map(Number);
            expect(wh >= 1 && wh <= 12 && wm % Math.min(step, 60) === 0, w.value).toBe(true);
          }
          const prev = stepHour(h, -1), next = stepHour(h, 1);
          expect(misconceptionOf(it, clockText(prev, m))).toBe("hour-off-by-one");
          // From half past on, the short hand is closer to the next number: setting that hour is its own slip.
          expect(misconceptionOf(it, clockText(next, m))).toBe(m >= 30 ? "hour-hand-next-hour" : "hour-off-by-one");
          // Read aloud the way people say it: "3 o'clock", not "3:00".
          if (m === 0) expect(it.say).toMatch(/o'clock|en punto/);
        }
    expect(seen).toBeGreaterThan(300);
  });

  it("the e2e fixture (level 3, seed 8) is a set-the-clock problem", () => {
    const it8 = makeItem("m.time.clock", 3, 8, "en");
    expect(it8.input).toBe("clock");
    expect(text(it8)).toMatch(/^Set the clock to \d{1,2}:\d{2}\.$/);
  });

  it("reading problems are still there", () => {
    expect(items("m.time.clock", 2).some((it) => it.input === "choices" && it.visual?.kind === "clock")).toBe(true);
  });
});

describe("m.frac.unit level 3: build the fraction on the bar", () => {
  it("level 3 mixes naming a shaded fraction with building one, so its checks ask for both", () => {
    const inputs = new Set(items("m.frac.unit", 3).map((it) => it.input));
    expect([...inputs].sort()).toEqual(["fraction", "fraction-bar"]);
    const placing = new Set(items("m.frac.numberline", 3).map((it) => it.input));
    expect([...placing].sort()).toEqual(["fraction", "number-line"]);
  });

  it("exactly the shadings equal to the prompt's fraction are right (checked by cross-multiplying)", () => {
    for (const locale of LOCALES)
      for (const it of items("m.frac.unit", 3, locale)) {
        if (it.input !== "fraction-bar") continue;
        if (it.pad?.kind !== "fraction-bar") throw new Error("pad");
        const [n, d] = fracIn(it);
        expect(it.pad.maxParts).toBeGreaterThanOrEqual(d);
        let rights = 0;
        for (let parts = 1; parts <= it.pad.maxParts; parts++)
          for (let shaded = 0; shaded <= parts; shaded++) {
            const ok = check(it.answer, `${shaded}/${parts}`).correct;
            expect(ok, `${shaded}/${parts} for ${n}/${d}`).toBe(shaded * d === n * parts);
            if (ok) rights++;
          }
        expect(rights).toBeGreaterThanOrEqual(1);
        for (const w of it.wrong ?? []) expect(misconceptionOf(it, w.value)).toBe(w.why);
      }
  });
});

describe("m.frac.numberline level 3: place the fraction", () => {
  it("exactly one point on the pad is right, and it is the prompt's fraction", () => {
    for (const locale of LOCALES)
      for (const it of items("m.frac.numberline", 3, locale)) {
        if (it.input !== "number-line") continue;
        if (it.pad?.kind !== "number-line") throw new Error("pad");
        const [n, d] = fracIn(it);
        expect(it.pad.denominator).toBe(d);
        const right = linePoints(it.pad).filter((p) => check(it.answer, p.response).correct);
        expect(right).toHaveLength(1);
        const [num, den] = right[0].response.split("/").map(Number);
        expect(num * d).toBe(n * den);
        expect(n / d).toBeLessThanOrEqual(it.pad.max);
        for (const w of it.wrong ?? []) {
          expect(check(it.answer, w.value).correct).toBe(false);
          expect(misconceptionOf(it, w.value)).toBe(w.why);
        }
      }
  });
});

describe("m.int.numberline: the opposite, placed on a number line", () => {
  it("the only right point is the prompt's number with its sign changed, and the line is symmetric", () => {
    let seen = 0;
    for (const locale of LOCALES)
      for (const it of items("m.int.numberline", 2, locale)) {
        if (it.input !== "number-line") continue;
        seen++;
        if (it.pad?.kind !== "number-line") throw new Error("pad");
        // −10 to 10: 21 points, a fair tap each on a phone.
        expect([it.pad.min, it.pad.max]).toEqual([-10, 10]);
        const n = Number(text(it).replace(/[−–]/g, "-").match(/-?\d+/)![0]);
        const right = linePoints(it.pad).filter((p) => check(it.answer, p.response).correct);
        expect(right.map((p) => p.value)).toEqual([-n]);
        expect(misconceptionOf(it, String(n))).toBe("kept-the-sign");
      }
    expect(seen).toBeGreaterThan(20);
    // Opposites beyond 10 are typed, and still tag the kept sign.
    const typed = items("m.int.numberline", 2).filter((it) => it.input === "keypad" && /opposite/.test(text(it)));
    expect(typed.length).toBeGreaterThan(0);
    for (const it of typed) {
      const n = Number(text(it).replace(/[−–]/g, "-").match(/-?\d+/)![0]);
      expect(misconceptionOf(it, String(n))).toBe("kept-the-sign");
    }
  });
});

describe("m.next.number: tap the number before or after", () => {
  it("the line holds both numbers, labels every one, and only the asked-for number is right", () => {
    for (const level of [1, 2, 3])
      for (const locale of LOCALES)
        for (const it of items("m.next.number", level, locale)) {
          expect(it.input).toBe("number-line");
          if (it.pad?.kind !== "number-line") throw new Error("pad");
          const n = Number(text(it).match(/\d+/)![0]);
          const after = /after|después/.test(text(it));
          const pts = linePoints(it.pad);
          expect(pts).toHaveLength(11);
          expect(pts.every((p) => p.major)).toBe(true);
          expect(pts.some((p) => p.value === n)).toBe(true);
          const right = pts.filter((p) => check(it.answer, p.response).correct);
          expect(right.map((p) => p.value)).toEqual([after ? n + 1 : n - 1]);
          expect(it.pad.max).toBeLessThanOrEqual(level === 1 ? 10 : level === 2 ? 20 : 100);
          for (const w of it.wrong ?? []) {
            expect(pointOf(pts, w.value)).toBeGreaterThanOrEqual(0);
            expect(misconceptionOf(it, w.value)).toBe(w.why);
          }
          expect(misconceptionOf(it, String(n))).toBe("picked-the-same-number");
        }
  });
});
