import { describe, expect, it } from "vitest";
import { assistanceFrom, attemptIdentity, digest, firstResponseOf } from "./evidence";
import type { AttemptSource, HelpExposure, ResponseEvent } from "./types";

const source: AttemptSource = { kind: "set-slot", profileId: "p", skillId: "m.add.5", setId: "s", slotId: "0", itemFingerprint: "item", contentVersion: "legacy" };
const help: HelpExposure = { id: "hint", attemptId: "a", profileId: "p", skillId: "m.add.5", kind: "hint", capturedAt: 100, delivery: "released" };
const miss: ResponseEvent = { id: "r1", attemptId: "a", profileId: "p", skillId: "m.add.5", capturedAt: 150, response: "2", correct: false, assisted: false };

describe("evidence replay", () => {
  it("uses source identity, rather than tab or property order, and separates content versions", () => {
    const { profileId, ...rest } = source;
    expect(attemptIdentity({ ...rest, profileId })).toBe(attemptIdentity(source));
    expect(attemptIdentity({ ...source, contentVersion: "reviewed-v1" })).not.toBe(attemptIdentity(source));
    expect(attemptIdentity({ ...source, profileId: "other" })).not.toBe(attemptIdentity(source));
  });

  it("ids are short and fixed-length, however long the source's ids are", () => {
    const uuid = () => crypto.randomUUID();
    const long: AttemptSource = { kind: "scene-question", profileId: uuid(), courseId: uuid(), sceneId: `${uuid()}/${uuid()}`, questionId: `${uuid()}:${uuid()}`, skillId: `scene:${uuid()}:${uuid()}:${uuid()}`, itemFingerprint: `${uuid()}/${uuid()}:${uuid()}`, contentVersion: "legacy" };
    expect(attemptIdentity(long)).toMatch(/^att_[A-Za-z0-9_-]{22}$/);
    expect(attemptIdentity(source)).toMatch(/^att_[A-Za-z0-9_-]{22}$/);
    expect(digest("a")).not.toBe(digest("b"));
    expect(digest("same")).toBe(digest("same"));
  });

  it("latches interrupted help conservatively and ignores other questions", () => {
    expect(assistanceFrom("a", [{ ...help, delivery: "latched" }, { ...help, id: "other", attemptId: "b", capturedAt: 200 }], [])).toEqual({ assisted: true, exposureIds: ["hint"], lastHelpAt: 100 });
    expect(assistanceFrom("b", [], [miss])).toEqual({ assisted: false, exposureIds: [] });
  });

  it("a miss makes this question's next answer helped, but is not help shown", () => {
    expect(assistanceFrom("a", [], [miss])).toEqual({ assisted: true, exposureIds: [] });
  });

  it("replays concurrent first-response candidates conservatively instead of hiding a miss", () => {
    const right = { ...miss, id: "r2", capturedAt: 160, correct: true, response: "3" };
    expect(firstResponseOf("a", [right, miss])).toEqual(miss);
    expect(assistanceFrom("a", [], [right, miss]).assisted).toBe(true);
  });
});
