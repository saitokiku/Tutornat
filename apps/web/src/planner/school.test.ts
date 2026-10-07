import { describe, expect, it } from "vitest";
import { classify, parseIcs, toIcs } from "./ics";
import { readSchoolText } from "./intake";
import { matchSkills } from "./skillmatch";

const ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "UID:abc-1@classroom.google.com",
  "DTSTART;VALUE=DATE:20261021",
  "SUMMARY:Math 6: Unit 3 Test",
  "DESCRIPTION:Ratios\\, rates and percents. Bring a calculator.",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:abc-2",
  "DTSTART;TZID=America/Chicago:20261015T083000",
  "SUMMARY:Reading log due",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:abc-3",
  "DTSTART:20261023T150000Z",
  "SUMMARY:Science fair project ",
  " due",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:No date here",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("ics", () => {
  it("reads all-day, local and UTC events, unfolds lines and unescapes text", () => {
    const events = parseIcs(ICS);
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ uid: "abc-1@classroom.google.com", title: "Math 6: Unit 3 Test", date: "2026-10-21", description: "Ratios, rates and percents. Bring a calculator." });
    expect(events[0].time).toBeUndefined();
    expect(events[1]).toMatchObject({ date: "2026-10-15", time: "08:30" });
    expect(events[2].title).toBe("Science fair project due");
  });

  it("classifies school items", () => {
    expect(classify("Math 6: Unit 3 Test")).toBe("test");
    expect(classify("Vocab quiz")).toBe("quiz");
    expect(classify("Reading log due")).toBe("homework");
    expect(classify("Science fair project due")).toBe("project");
    expect(classify("No School – Teacher Work Day")).toBe("no-school");
    expect(classify("Examen de fracciones")).toBe("test");
    expect(classify("Picture day")).toBe("event");
  });

  it("writes an .ics that reads back", () => {
    const text = toIcs([{ id: "1", title: "Quiz, chapter 2; bring pencil", date: "2026-11-02", kind: "quiz" }, { id: "2", title: "Band", date: "2026-11-03", time: "15:30", kind: "event" }]);
    const back = parseIcs(text);
    expect(back[0]).toMatchObject({ title: "Quiz, chapter 2; bring pencil", date: "2026-11-02" });
    expect(back[1]).toMatchObject({ date: "2026-11-03", time: "15:30" });
  });
});

describe("pasted school text", () => {
  const today = "2026-10-07";
  it("finds dated items in common formats and never invents a date", () => {
    const { found, undated } = readSchoolText(
      [
        "Unit 3 Test - Tue 10/21",
        "• Chapter 4 reading due October 14",
        "Project: water cycle poster, due Nov. 3rd",
        "Examen de fracciones: 28 de octubre",
        "Homework every night: 20 minutes of reading",
        "2026-12-18 Winter break begins (no school)",
        "Field trip form",
      ].join("\n"),
      today,
    );
    expect(found.map((f) => [f.date, f.kind])).toEqual([
      ["2026-10-21", "test"],
      ["2026-10-14", "homework"],
      ["2026-11-03", "project"],
      ["2026-10-28", "test"],
      ["2026-12-18", "no-school"],
    ]);
    expect(found[0].title).toBe("Unit 3 Test");
    expect(undated).toEqual(["Homework every night: 20 minutes of reading"]);
  });

  it("puts a past month/day without a year into next year", () => {
    expect(readSchoolText("Final exam June 5", today).found[0].date).toBe("2027-06-05");
    expect(readSchoolText("Quiz Sept 30", today).found[0].date).toBe("2026-09-30");
  });

  it("rejects impossible dates", () => {
    expect(readSchoolText("Test 2/30", today).found).toEqual([]);
  });
});

describe("matching school words to skills", () => {
  it("bridges teacher language to the skill map", () => {
    expect(matchSkills("needs more practice with borrowing")).toContain("m.sub.2digit");
    expect(matchSkills("Telling time to the half hour")).toContain("m.time.clock");
    expect(matchSkills("nothing related at all")).toEqual([]);
  });
});
