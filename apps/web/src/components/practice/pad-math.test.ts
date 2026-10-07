import { describe, expect, it } from "vitest";
import { check } from "@/practice/answer";
import { angleAt, clockText, handAngles, hourAt, labelsCrowded, linePoints, minuteAt, nearestPoint, pointOf, responseOf, startPoint, stepHour, stepMinute } from "./pad-math";

describe("number-line points", () => {
  it("a whole-number line has one point per step, labels on round values, and checker-ready responses", () => {
    const pts = linePoints({ kind: "number-line", min: -25, max: 25, step: 1 });
    expect(pts).toHaveLength(51);
    expect(pts[0]).toMatchObject({ value: -25, response: "-25", label: "−25", major: true });
    expect(pts.filter((p) => p.major).map((p) => p.value)).toEqual([-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25]);
    for (const p of pts) expect(check({ kind: "number", value: p.value }, p.response).correct).toBe(true);
  });

  it("a fraction line has a point every 1/denominator and labels only the wholes", () => {
    const pts = linePoints({ kind: "number-line", min: 0, max: 2, step: 1, denominator: 4 });
    expect(pts.map((p) => p.response)).toEqual(["0/4", "1/4", "2/4", "3/4", "4/4", "5/4", "6/4", "7/4", "8/4"]);
    expect(pts.filter((p) => p.major).map((p) => p.label)).toEqual(["0", "1", "2"]);
    expect(pts[3].label).toBe("3/4");
    for (const p of pts) expect(check({ kind: "fraction", n: p.value * 4, d: 4 }, p.response).correct).toBe(true);
  });

  it("decimal steps stay exact", () => {
    const pts = linePoints({ kind: "number-line", min: 0, max: 1, step: 0.1 });
    expect(pts.map((p) => p.response)).toEqual(["0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1"]);
  });

  it("negative fractions keep their sign", () => {
    const pts = linePoints({ kind: "number-line", min: -1, max: 1, step: 1, denominator: 2 });
    expect(pts.map((p) => p.response)).toEqual(["-2/2", "-1/2", "0/2", "1/2", "2/2"]);
    expect(pts[1].label).toBe("−1/2");
  });

  it("labels are thinned on a phone only when they would collide", () => {
    // 0–10: eleven one-digit labels about 26 px apart fit a 320 px phone.
    expect(labelsCrowded(linePoints({ kind: "number-line", min: 0, max: 10, step: 1 }))).toBe(false);
    // −10–10 labels every 5 (−10, −5, 0, 5, 10): five labels, plenty of room.
    const sym = linePoints({ kind: "number-line", min: -10, max: 10, step: 1 });
    expect(sym.filter((p) => p.major).map((p) => p.value)).toEqual([-10, -5, 0, 5, 10]);
    expect(labelsCrowded(sym)).toBe(false);
    // Fourths from 0 to 2 label only 0, 1 and 2.
    expect(labelsCrowded(linePoints({ kind: "number-line", min: 0, max: 2, step: 1, denominator: 4 }))).toBe(false);
    // Three-digit labels every 10 on a 0–100 line would touch, so a phone shows every other one.
    expect(labelsCrowded(linePoints({ kind: "number-line", min: -100, max: 100, step: 1 }))).toBe(true);
  });

  it("taps snap to the nearest point; the keyboard starts at 0", () => {
    expect(nearestPoint(0, 11)).toBe(0);
    expect(nearestPoint(0.52, 11)).toBe(5);
    expect(nearestPoint(1.4, 11)).toBe(10);
    expect(nearestPoint(-0.2, 11)).toBe(0);
    const pts = linePoints({ kind: "number-line", min: -5, max: 5, step: 1 });
    expect(pts[startPoint(pts)].value).toBe(0);
    expect(startPoint(linePoints({ kind: "number-line", min: 3, max: 9, step: 1 }))).toBe(0);
    expect(pointOf(pts, "-2")).toBe(3);
    expect(pointOf(pts, "7")).toBe(-1);
  });
});

describe("clock arithmetic", () => {
  it("writes times the way the checker expects", () => {
    expect(clockText(3, 5)).toBe("3:05");
    expect(clockText(12, 0)).toBe("12:00");
    expect(check({ kind: "text", accept: ["3:05"] }, clockText(3, 5)).correct).toBe(true);
  });

  it("turns a tap into an angle, then into an hour or snapped minutes", () => {
    expect(angleAt(100, 0, 100, 100)).toBeCloseTo(0);
    expect(angleAt(200, 100, 100, 100)).toBeCloseTo(90);
    expect(angleAt(100, 200, 100, 100)).toBeCloseTo(180);
    expect(angleAt(0, 100, 100, 100)).toBeCloseTo(270);
    expect([0, 14, 16, 90, 345, 359].map((deg) => hourAt(deg))).toEqual([12, 12, 1, 3, 12, 12]);
    expect(hourAt(100)).toBe(3);
    expect(minuteAt(90, 5)).toBe(15);
    expect(minuteAt(92, 5)).toBe(15);
    expect(minuteAt(180, 30)).toBe(30);
    expect(minuteAt(100, 30)).toBe(30);
    expect(minuteAt(80, 30)).toBe(0);
    expect(minuteAt(358, 5)).toBe(0);
    expect(minuteAt(180, 60)).toBe(0);
    expect(minuteAt(93, 1)).toBe(16);
  });

  it("steps wrap around the face", () => {
    expect(stepHour(12, 1)).toBe(1);
    expect(stepHour(1, -1)).toBe(12);
    expect(stepHour(5, 3)).toBe(8);
    expect(stepMinute(55, 1, 5)).toBe(0);
    expect(stepMinute(0, -1, 5)).toBe(55);
    expect(stepMinute(30, 1, 30)).toBe(0);
    expect(stepMinute(0, 1, 60)).toBe(0);
  });

  it("the hour hand sits between hours as the minutes pass", () => {
    expect(handAngles(3, 0)).toEqual({ hour: 90, minute: 0 });
    expect(handAngles(3, 30)).toEqual({ hour: 105, minute: 180 });
    expect(handAngles(12, 45).hour).toBeCloseTo(22.5);
  });

  it("a tap on the face is read as where the short hand sits at those minutes", () => {
    // Half past 3: the short hand is half way from 3 to 4 (105°). A tap there is 3, not 4.
    expect(hourAt(105, 30)).toBe(3);
    expect(hourAt(handAngles(3, 30).hour, 30)).toBe(3);
    // Quarter to 4 is 3:45: the short hand is three quarters of the way to 4.
    expect(hourAt(112, 45)).toBe(3);
    expect(hourAt(handAngles(3, 45).hour, 45)).toBe(3);
    // Near the top, the wrap to 12 still works at any minutes.
    expect(hourAt(handAngles(12, 55).hour, 55)).toBe(12);
    expect(hourAt(handAngles(11, 50).hour, 50)).toBe(11);
    // Every hour, at every 5 minutes: a tap exactly on the drawn short hand gives back that hour.
    for (let h = 1; h <= 12; h++) for (let m = 0; m < 60; m += 5) expect(hourAt(handAngles(h, m).hour, m), `${h}:${m}`).toBe(h);
  });

  it("an untouched clock answers with the time it shows; other pads send nothing until used", () => {
    expect(responseOf("clock", "")).toBe("12:00");
    expect(responseOf("clock", "3:30")).toBe("3:30");
    expect(responseOf("number-line", "")).toBe("");
    expect(responseOf("keypad", "7")).toBe("7");
  });
});
