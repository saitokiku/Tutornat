import { beforeEach, describe, expect, it } from "vitest";
import { read, resetMemory, update } from "./store";
import { familyNames, logTutorAct, withoutNames } from "./tutor";

// What leaves for the AI tutor carries no family names, and the record says which skills a
// conversation helped with: one act per conversation, skill and day.

beforeEach(() => resetMemory());

describe("withoutNames", () => {
  it("takes out each name as a whole word, as written, Capitalized or in capitals", () => {
    const names = ["Ada", "Leo", "Maria Lopez", "Maria", "Lopez"];
    expect(withoutNames("Ada still needs page 4. ADA and leo? Leo's poster.", names)).toBe("[name] still needs page 4. [name] and leo? [name]'s poster.");
    expect(withoutNames("Notes from Maria Lopez for Adam", names)).toBe("Notes from [name] for Adam");
    expect(withoutNames("José y Ángel", ["ángel", "José"])).toBe("[name] y [name]");
    expect(withoutNames("nothing to hide", names)).toBe("nothing to hide");
  });
});

describe("familyNames", () => {
  it("are this family's learners and grown-up, each word too; not another family's", () => {
    update((s) => {
      s.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria Lopez", salt: "", passwordHash: "", createdAt: 0 });
      s.profiles.push(
        { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 },
        { id: "p2", accountId: "a1", nickname: "Leo", grade: "K", locale: "en", color: "#000", createdAt: 0 },
        { id: "p3", accountId: "other", nickname: "Zoe", grade: "2", locale: "en", color: "#000", createdAt: 0 },
      );
    });
    expect(familyNames(read(), "p1").sort()).toEqual(["Ada", "Leo", "Lopez", "Maria", "Maria Lopez"]);
  });
});

describe("logTutorAct", () => {
  it("one act per conversation, skill and day; a second skill in the same conversation is recorded too", () => {
    const at = new Date(2026, 9, 7, 10).getTime();
    logTutorAct("p1", "thread-1", "e.fallacies", undefined, at);
    logTutorAct("p1", "thread-1", "e.fallacies", undefined, at + 60_000);
    logTutorAct("p1", "thread-1", "m.frac.addlike", "set-9", at + 120_000);
    logTutorAct("p1", "thread-1", "not.a.skill", undefined, at);
    logTutorAct("p1", "thread-1", "e.fallacies", undefined, at + 86_400_000); // the next day
    const acts = read().acts.filter((a) => a.kind === "tutor");
    expect(acts.map((a) => [a.skillId, a.ref, a.setId])).toEqual([
      ["e.fallacies", "thread-1", undefined],
      ["m.frac.addlike", "thread-1", "set-9"],
      ["e.fallacies", "thread-1", undefined],
    ]);
    expect(acts.every((a) => a.intent === "next-try-right" && a.outcome === undefined)).toBe(true);
  });
});
