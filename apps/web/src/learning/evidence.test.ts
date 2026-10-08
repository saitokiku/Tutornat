import { describe, expect, it } from "vitest";
import { assistanceFrom, attemptIdentity, firstResponseOf } from "./evidence";
import type { AttemptSource, HelpExposure, ResponseEvent } from "./types";

const source: AttemptSource = { kind: "set-slot", profileId: "p", skillId: "m.add.5", setId: "s", slotId: "0", itemFingerprint: "item", contentVersion: "legacy" };
const { kind, ...facts } = source;
const help: HelpExposure = { ...facts, sourceKind: kind, id: "hint", attemptId: "a", kind: "hint", capturedAt: 100, delivery: "released" };
const miss: ResponseEvent = { ...facts, sourceKind: kind, id: "r1", attemptId: "a", capturedAt: 150, response: "2", correct: false, assisted: false };

describe("evidence replay", () => {
  it("uses source identity, rather than tab or property order, and separates content versions", () => {
    const { profileId, ...rest } = source;
    expect(attemptIdentity({ ...rest, profileId })).toBe(attemptIdentity(source));
    expect(attemptIdentity({ ...source, contentVersion: "reviewed-v1" })).not.toBe(attemptIdentity(source));
    expect(attemptIdentity({ ...source, profileId: "other" })).not.toBe(attemptIdentity(source));
  });

  it("latches interrupted help conservatively and ignores other questions", () => {
    expect(assistanceFrom("a", [{ ...help, delivery: "latched" }, { ...help, id: "other", attemptId: "b", capturedAt: 200 }], [])).toEqual({ assisted: true, exposureIds: ["hint"], lastHelpAt: 100 });
    expect(assistanceFrom("b", [], [miss])).toEqual({ assisted: false, exposureIds: [] });
  });

  it("replays concurrent first-response candidates conservatively instead of hiding a miss", () => {
    const right = { ...miss, id: "r2", capturedAt: 160, correct: true, response: "3" };
    expect(firstResponseOf("a", [right, miss])).toEqual(miss);
    expect(assistanceFrom("a", [], [right, miss])).toEqual({ assisted: true, exposureIds: [], lastHelpAt: 150 });
  });
});
