import { afterEach, describe, expect, it } from "vitest";
import { record, summarizeWeek, startOfWeek, courseProgress } from "./activity";
import { signIn, signUp } from "./auth";
import { addFromCatalogue, createDraft, getCourse } from "./courses";
import { generateOutline, guessSubject } from "./generate";
import { createLearner, removeLearner, selectLearner } from "./profiles";
import { read, resetMemory } from "./store";
import type { GenerationEvent, GenerationRequest, Profile } from "./types";

afterEach(() => resetMemory());

const req = (length: GenerationRequest["length"]): GenerationRequest => ({
  goal: "I want to learn fractions", grade: "3", subject: "math", length, locale: "en", sources: [],
});

async function family() {
  await signUp({ email: "Parent@Example.com", password: "longenough", displayName: "Sam" });
  const a = createLearner({ nickname: "  Ada ", grade: "3", locale: "en" }) as Profile;
  const b = createLearner({ nickname: "Bo", grade: "7", locale: "es" }) as Profile;
  return { a, b };
}

describe("auth", () => {
  it("signUp rejects a short password and a bad email", async () => {
    const r = await signUp({ email: "nope", password: "short", displayName: "Sam" });
    expect(r).toEqual({ ok: false, fields: { email: "err.email", password: "err.password" } });
  });

  it("duplicate email is rejected case-insensitively", async () => {
    await signUp({ email: "a@b.co", password: "longenough", displayName: "Sam" });
    const r = await signUp({ email: " A@B.CO ", password: "longenough", displayName: "Sam" });
    expect(r).toEqual({ ok: false, fields: { email: "err.emailTaken" } });
  });

  it("signIn checks the password", async () => {
    await signUp({ email: "a@b.co", password: "longenough", displayName: "Sam" });
    expect(await signIn("a@b.co", "wrongwrong")).toEqual({ ok: false, error: "err.badLogin" });
    expect(await signIn("A@B.co", "longenough")).toEqual({ ok: true });
  });
});

describe("learners", () => {
  it("createLearner trims and validates the nickname", async () => {
    const { a } = await family();
    expect(a.nickname).toBe("Ada");
    expect(createLearner({ nickname: "   ", grade: "3", locale: "en" })).toBe("err.nickname");
    expect(createLearner({ nickname: "x".repeat(41), grade: "3", locale: "en" })).toBe("err.nickname");
  });

  it("removing the active learner clears the selection and their data", async () => {
    const { a } = await family();
    selectLearner(a.id);
    const id = addFromCatalogue("math-fractions", a.id)!;
    removeLearner(a.id);
    expect(read().session.profileId).toBeNull();
    expect(read().courses.find((c) => c.id === id)).toBeUndefined();
    expect(read().activity.some((e) => e.profileId === a.id)).toBe(false);
  });
});

describe("courses", () => {
  it("getCourse returns null for another learner's course", async () => {
    const { a, b } = await family();
    const id = addFromCatalogue("math-fractions", a.id)!;
    expect(getCourse(read(), id, a.id)?.title).toBe("Fractions: parts of a whole");
    expect(getCourse(read(), id, b.id)).toBeNull();
  });

  it("adding the same ready-made course twice returns the first copy", async () => {
    const { a } = await family();
    expect(addFromCatalogue("math-fractions", a.id)).toBe(addFromCatalogue("math-fractions", a.id));
  });

  it("drafts take a title from the goal", async () => {
    const { a } = await family();
    expect(createDraft(req("short"), a.id).title).toBe("Fractions");
  });
});

describe("generateOutline", () => {
  const run = async (r: GenerationRequest, abortAfter?: number) => {
    const ctrl = new AbortController();
    const seen: GenerationEvent[] = [];
    for await (const e of generateOutline(r, ctrl.signal, 0)) {
      seen.push(e);
      if (seen.length === abortAfter) ctrl.abort();
    }
    return seen;
  };

  it("emits steps, then one event per lesson, then done", async () => {
    for (const [length, n] of [["lesson", 1], ["short", 4], ["full", 8]] as const) {
      const events = await run(req(length));
      expect(events.slice(0, 3).map((e) => e.type)).toEqual(["step", "step", "step"]);
      expect(events.filter((e) => e.type === "lesson")).toHaveLength(n);
      expect(events.at(-1)).toEqual({ type: "done" });
    }
  });

  it("abort stops the stream", async () => {
    const events = await run(req("full"), 4);
    expect(events).toHaveLength(4);
    expect(events.some((e) => e.type === "done")).toBe(false);
  });

  it("guesses the subject", () => {
    expect(guessSubject("why does the moon change shape")).toBe("science");
    expect(guessSubject("negative numbers")).toBe("math");
    expect(guessSubject("write a persuasive essay")).toBe("english");
    expect(guessSubject("dinosaurs")).toBe("science");
    expect(guessSubject("knitting")).toBe("other");
  });
});

describe("activity", () => {
  it("summarizeWeek keeps hinted answers separate from answers on your own", async () => {
    const { a } = await family();
    const courseId = addFromCatalogue("math-fractions", a.id)!;
    const base = { profileId: a.id, courseId, lessonId: "halves-quarters" };
    record({ ...base, type: "lesson_started" });
    record({ ...base, type: "quiz_answered", correct: true, assisted: false });
    record({ ...base, type: "quiz_answered", correct: true, assisted: true });
    record({ ...base, type: "quiz_answered", correct: false, assisted: false });
    record({ ...base, type: "lesson_completed", seconds: 600 });
    const w = summarizeWeek(read().activity, startOfWeek(Date.now()));
    expect(w).toMatchObject({ started: 1, finished: 1, own: 1, help: 1, missed: 1, minutes: 10 });
    const course = getCourse(read(), courseId, a.id)!;
    expect(courseProgress(course, read().activity)).toMatchObject({ done: 1, total: 4 });
  });
});
