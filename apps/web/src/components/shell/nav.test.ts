import { describe, expect, it } from "vitest";
import { LEARNER_TABS, PARENT_TABS, barTabs, digitOf, placeOf } from "./nav";

describe("shell places", () => {
  it("finds the tab a path belongs to, nested pages included", () => {
    expect(placeOf("/home", LEARNER_TABS)).toBe("home");
    expect(placeOf("/courses/abc", LEARNER_TABS)).toBe("learn");
    expect(placeOf("/courses/new", LEARNER_TABS)).toBe("learn");
    expect(placeOf("/practiceX", LEARNER_TABS)).toBeNull();
    expect(placeOf("/settings", LEARNER_TABS)).toBeNull();
    expect(placeOf("/family/p1/records", PARENT_TABS)).toBe("family");
  });

  it("files the places a phone bar has no room for under Me", () => {
    const bar = barTabs(true);
    expect(bar.map((t) => t.place)).toEqual(["home", "practice", "talk", "learn", "me"]);
    expect(placeOf("/calendar", bar)).toBe("me");
    expect(placeOf("/settings", bar)).toBe("me");
    expect(placeOf("/settings", barTabs(false))).toBe("settings");
  });

  it("reads a digit from the key or, on other layouts, from the key's position", () => {
    expect(digitOf({ key: "2", code: "Digit2" })).toBe(2);
    expect(digitOf({ key: "&", code: "Digit1" })).toBe(1); // AZERTY
    expect(digitOf({ key: "3", code: "Numpad3" })).toBe(3);
    expect(digitOf({ key: "0", code: "Digit0" })).toBeNull();
    expect(digitOf({ key: "a", code: "KeyA" })).toBeNull();
  });
});
