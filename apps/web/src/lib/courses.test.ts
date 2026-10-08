import { afterEach, describe, expect, it } from "vitest";
import type { Statuses } from "@/learning/engine";
import { skillsFor } from "@/practice/skills";
import {
  addFromCatalogue,
  courseOrigin,
  createDraft,
  finishDraft,
  moveCourse,
  pathOf,
  skillSummary,
  sortPath,
  suggestNext,
} from "./courses";
import { read, resetMemory, update } from "./store";
import type { Course } from "./types";

afterEach(() => resetMemory());

const P = "p1";
const titles = (subject: Course["subject"] = "math") => pathOf(read(), P, subject).map((c) => c.catalogueId ?? c.title);
/** Makes `at` the creation time of a course, so "date added" is under the test's control. */
const addedAt = (id: string, at: number) => update((s) => void (s.courses.find((c) => c.id === id)!.createdAt = at));

describe("sortPath", () => {
  const c = (id: string, createdAt: number, extra: Partial<Course> = {}) => ({ id, createdAt, ...extra });

  it("placed courses by order, then a grown-up's, then by date added", () => {
    const list = [c("late", 3), c("early", 1), c("assigned", 5, { assigned: true }), c("placed1", 9, { order: 1 }), c("placed0", 8, { order: 0 })];
    expect(sortPath(list).map((x) => x.id)).toEqual(["placed0", "placed1", "assigned", "early", "late"]);
  });

  it("is stable for equal dates (by id) and does not change its input", () => {
    const list = [c("b", 1), c("a", 1)];
    expect(sortPath(list).map((x) => x.id)).toEqual(["a", "b"]);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("the path", () => {
  it("lists one subject's ready courses for one learner; outlines still being built stay off it", () => {
    const a = addFromCatalogue("math-fractions", P)!;
    addFromCatalogue("science-moon", P);
    addFromCatalogue("math-negative", "someone-else");
    createDraft({ goal: "long division", grade: "4", subject: "math", length: "short", locale: "en", sources: [] }, P);
    expect(pathOf(read(), P, "math").map((x) => x.id)).toEqual([a]);
  });

  it("moveCourse swaps neighbours and the order persists in the store", () => {
    const ids = ["math-add-number-line", "math-fractions", "math-negative"].map((id, i) => {
      const x = addFromCatalogue(id, P)!;
      addedAt(x, i + 1);
      return x;
    });
    expect(titles()).toEqual(["math-add-number-line", "math-fractions", "math-negative"]);
    expect(moveCourse(ids[2], "up")).toBe(true);
    expect(titles()).toEqual(["math-add-number-line", "math-negative", "math-fractions"]);
    resetMemory(); // a reload: read the saved document again
    expect(titles()).toEqual(["math-add-number-line", "math-negative", "math-fractions"]);
    expect(read().courses.filter((x) => x.subject === "math").map((x) => x.order).sort()).toEqual([0, 1, 2]);
    expect(moveCourse(ids[0], "down")).toBe(true);
    expect(titles()).toEqual(["math-negative", "math-add-number-line", "math-fractions"]);
  });

  it("moveCourse does nothing at either end, for unknown courses, or across subjects", () => {
    const m = addFromCatalogue("math-fractions", P)!;
    const s = addFromCatalogue("science-moon", P)!;
    expect(moveCourse(m, "up")).toBe(false);
    expect(moveCourse(m, "down")).toBe(false); // science is a different path
    expect(moveCourse(s, "up")).toBe(false);
    expect(moveCourse("nope", "down")).toBe(false);
    expect(read().courses.every((x) => x.order === undefined)).toBe(true);
  });

  it("a course a learner adds after reordering goes to the end of the path", () => {
    const a = addFromCatalogue("math-add-number-line", P)!;
    const b = addFromCatalogue("math-fractions", P)!;
    addedAt(a, 1);
    addedAt(b, 2);
    moveCourse(b, "up");
    addFromCatalogue("math-negative", P);
    expect(titles()).toEqual(["math-fractions", "math-add-number-line", "math-negative"]);
  });

  it("an assigned course leads its path, also after the learner reordered it", () => {
    const a = addFromCatalogue("math-add-number-line", P)!;
    const b = addFromCatalogue("math-negative", P)!;
    addedAt(a, 1);
    addedAt(b, 2);
    addFromCatalogue("math-fractions", P, { assigned: true });
    expect(titles()).toEqual(["math-fractions", "math-add-number-line", "math-negative"]);
    moveCourse(b, "up");
    moveCourse(b, "up");
    expect(titles()).toEqual(["math-negative", "math-fractions", "math-add-number-line"]);
    addFromCatalogue("math-slope", P, { assigned: true });
    expect(titles()[0]).toBe("math-slope");
  });

  it("assigning a course the learner already has marks it and moves it to the top", () => {
    const a = addFromCatalogue("math-add-number-line", P)!;
    const b = addFromCatalogue("math-fractions", P)!;
    addedAt(a, 1);
    addedAt(b, 2);
    moveCourse(a, "down");
    expect(addFromCatalogue("math-add-number-line", P, { assigned: true })).toBe(a);
    expect(titles()).toEqual(["math-add-number-line", "math-fractions"]);
    expect(read().courses.find((x) => x.id === a)!.assigned).toBe(true);
  });
});

describe("suggestNext", () => {
  it("suggests the nearest ready-made course the learner doesn't have, a step up before a step back", () => {
    expect(suggestNext([], "math", "4", "en")?.id).toBe("math-multiply-bigger");
    // Grade 5 (decimals) and grade 3 (fractions, multiplication) are one grade away: the step up wins.
    expect(suggestNext([{ catalogueId: "math-multiply-bigger" }], "math", "4", "en")?.id).toBe("math-decimals");
    // One grade back beats two grades up (grade 6).
    expect(suggestNext([{ catalogueId: "math-multiply-bigger" }, { catalogueId: "math-decimals" }], "math", "4", "en")?.grade).toBe("3");
    expect(suggestNext([{ catalogueId: "science-energy" }], "science", "4", "en")?.grade).toBe("5");
  });

  it("a course in either language counts as had", () => {
    expect(suggestNext([{ catalogueId: "math-fractions-es" }], "math", "3", "en")?.id).not.toMatch(/^math-fractions/);
    expect(suggestNext([], "math", "3", "es")?.id).toBe("math-fractions-es");
  });

  it("suggests nothing more than two grades away", () => {
    const k2 = ["math-numbers-to-10", "math-add-number-line"].map((catalogueId) => ({ catalogueId }));
    expect(suggestNext(k2, "math", "K", "en")?.grade).toBe("2");
    expect(suggestNext([...k2, { catalogueId: "math-hundreds-tens-ones" }], "math", "K", "en")).toBeNull();
    expect(suggestNext([], "other", "4", "en")).toBeNull();
  });
});

describe("skillSummary", () => {
  it("counts proved and practicing from statuses, never practice as proved", () => {
    const [a, b, c] = skillsFor("math");
    const st = (state: Statuses[string]["state"]) => ({ state }) as Statuses[string];
    const statuses: Statuses = { [a.id]: st("proved"), [b.id]: st("ready"), [c.id]: st("practicing"), "s.cells": st("proved") };
    expect(skillSummary(statuses, "math")).toEqual({ proved: 1, practicing: 2, total: skillsFor("math").length });
    expect(skillSummary({}, "science")).toMatchObject({ proved: 0, practicing: 0 });
  });
});

describe("origins and course acts", () => {
  it("labels every course by who made it", () => {
    const base = { origin: "generated" as const };
    expect(courseOrigin({ origin: "catalogue" })).toBe("people");
    expect(courseOrigin({ ...base, ai: true })).toBe("ai");
    expect(courseOrigin({ ...base, citations: [] })).toBe("sources");
    expect(courseOrigin(base)).toBe("template");
  });

  it("adding a ready-made course records one course act; adding it again records none", () => {
    const id = addFromCatalogue("math-fractions", P)!;
    addFromCatalogue("math-fractions", P);
    expect(read().acts).toEqual([expect.objectContaining({ profileId: P, kind: "course", intent: "course-finished", ref: id })]);
    expect(read().acts[0].outcome).toBeUndefined();
  });

  it("finishing a built draft makes it ready and records the act once", () => {
    const d = createDraft({ goal: "volcanoes", grade: "4", subject: "science", length: "short", locale: "en", sources: [] }, P);
    const lessons = [{ id: "l1", title: "Start here", summary: "", minutes: 3, scenes: [] }];
    expect(finishDraft(d.id, "someone-else", { title: "X", lessons })).toBe(false);
    expect(finishDraft(d.id, P, { title: "Volcanoes", lessons })).toBe(true);
    expect(finishDraft(d.id, P, { title: "Again", lessons })).toBe(false);
    expect(read().courses[0]).toMatchObject({ status: "ready", title: "Volcanoes", lessons });
    expect(read().acts.filter((a) => a.ref === d.id)).toHaveLength(1);
  });
});
