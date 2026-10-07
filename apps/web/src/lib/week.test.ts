import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, localDate } from "@/planner/dates";
import { parseIcs } from "@/planner/ics";
import { addClass, addEvent, classesOf, eventsOf, updateEvent } from "./school";
import { read, resetMemory, update } from "./store";
import type { Course, Profile } from "./types";
import { addRequest, calendarFile, fetchCalendar, icsDrafts, refreshAll, refreshClass, saveImport, unlinkCalendar, weekInput, weekOf } from "./week";

const NOW = new Date("2026-10-07T16:00:00").getTime();
const TODAY = localDate(NOW);
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };

const feed = (events: { uid?: string; date: string; title: string }[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...events.flatMap((e) => ["BEGIN:VEVENT", ...(e.uid ? [`UID:${e.uid}`] : []), `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `SUMMARY:${e.title}`, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");
const ics = (date: string) => date.replace(/-/g, "");

/** Stands in for /api/ics: answers with `body` (a calendar) or an error code. */
function serve(body: string | { status: number; error: string }) {
  const fetch = vi.fn(async () => (typeof body === "string" ? new Response(body, { headers: { "content-type": "text/calendar" } }) : Response.json({ error: body.error }, { status: body.status })));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetMemory();
});

describe("weekInput / weekOf", () => {
  it("reads one learner's record the way Today does", () => {
    const course: Course = {
      id: "c1", profileId: "p1", title: "Fractions", goal: "", subject: "math", grade: "4", locale: "en", origin: "catalogue", status: "ready", length: "short", sources: [], template: false, createdAt: 0, updatedAt: 0,
      lessons: [
        { id: "l1", title: "Halves", summary: "", minutes: 8, scenes: [] },
        { id: "l2", title: "Quarters", summary: "", minutes: 9, scenes: [] },
      ],
    };
    update((s) => {
      s.courses.push(course);
      s.activity.push({ id: "x", profileId: "p1", at: NOW - 3600_000, type: "lesson_completed", courseId: "c1", lessonId: "l1" });
      s.activity.push({ id: "y", profileId: "other", at: NOW, type: "lesson_completed", courseId: "c1", lessonId: "l2" });
    });
    const input = weekInput(read(), ada, NOW);
    expect(input.date).toBe(TODAY);
    expect(input.settings.dailyMinutes).toBe(15);
    expect(input.lessonsDone.map((l) => l.lessonId)).toEqual(["l1"]);
    expect(input.lesson).toMatchObject({ lessonId: "l1" }); // finished today: stays on today's plan
    expect(input.nextLesson).toMatchObject({ lessonId: "l2", minutes: 9 });
  });

  it("puts prep for a test added five days out on the three days before it", () => {
    addEvent("p1", { title: "Multiplication test", kind: "test", date: addDays(TODAY, 5), skillIds: ["m.mult.facts"] });
    const week = weekOf(read(), ada, NOW, TODAY);
    expect(week.filter((d) => d.lines.some((l) => l.kind === "prep")).map((d) => d.date)).toEqual([2, 3, 4].map((n) => addDays(TODAY, n)));
  });
});

describe("addRequest", () => {
  it("maps ?add= kinds and keeps only a real date", () => {
    expect(addRequest(null, null)).toBeNull();
    expect(addRequest("test", null)).toEqual({ kind: "test", date: undefined });
    expect(addRequest("homework", "2026-10-12")).toEqual({ kind: "homework", date: "2026-10-12" });
    expect(addRequest("quiz", "2026-02-30")?.date).toBeUndefined();
    expect(addRequest("project", "tomorrow")).toEqual({ kind: "project", date: undefined });
    expect(addRequest("other", null)?.kind).toBe("event");
    expect(addRequest("nonsense", null)).toEqual({ kind: undefined, date: undefined });
  });
});

describe("fetchCalendar", () => {
  it("returns the calendar text, or the server's error code", async () => {
    const f = serve(feed([{ uid: "u1", date: TODAY, title: "Quiz" }]));
    expect(await fetchCalendar(" https://school.example/cal.ics ")).toMatchObject({ ok: true });
    expect(f).toHaveBeenCalledWith("/api/ics", expect.objectContaining({ method: "POST", body: JSON.stringify({ url: "https://school.example/cal.ics" }) }));
    serve({ status: 400, error: "blocked" });
    expect(await fetchCalendar("https://x")).toEqual({ ok: false, error: "blocked" });
    serve({ status: 502, error: "something-new" });
    expect(await fetchCalendar("https://x")).toEqual({ ok: false, error: "status" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await fetchCalendar("https://x")).toEqual({ ok: false, error: "network" });
  });
});

describe("class calendar import and refresh", () => {
  const first = feed([
    { uid: "u1", date: addDays(TODAY, 3), title: "Unit 3 Test" },
    { uid: "u2", date: addDays(TODAY, 1), title: "Reading log due" },
    { date: addDays(TODAY, 4), title: "Picture day" },
    { uid: "old", date: addDays(TODAY, -30), title: "Long ago quiz" },
  ]);

  it("keeps a link on a new class, files every item under it, and saves nothing twice", () => {
    const drafts = icsDrafts(read(), "p1", first, TODAY);
    expect(drafts.map((d) => d.title)).toEqual(["Unit 3 Test", "Reading log due", "Picture day"]);
    expect(drafts[2].uid).toMatch(/^kz:/); // no UID in the feed: one made from date and name
    const r = saveImport("p1", drafts, "ics", { url: " https://school.example/math.ics ", newClass: { name: "Math 6", subject: "math" } });
    expect(r).toMatchObject({ added: 3, updated: 0, unchanged: 0 });
    const [cls] = classesOf(read(), "p1");
    expect(cls).toMatchObject({ name: "Math 6", subject: "math", feedUrl: "https://school.example/math.ics" });
    expect(eventsOf(read(), "p1").every((e) => e.classId === cls.id && e.source === "ics")).toBe(true);
    // The same file again: nothing new, nothing duplicated.
    expect(saveImport("p1", icsDrafts(read(), "p1", first, TODAY), "ics")).toMatchObject({ added: 0, updated: 0, unchanged: 3 });
    expect(eventsOf(read(), "p1")).toHaveLength(3);
  });

  it("refreshes by UID: moves dates, adds new items, keeps what the family set", async () => {
    saveImport("p1", icsDrafts(read(), "p1", first, TODAY), "ics", { url: "https://school.example/math.ics", newClass: { name: "Math 6", subject: "math" } });
    const cls = classesOf(read(), "p1")[0];
    const test = eventsOf(read(), "p1").find((e) => e.uid === "u1")!;
    updateEvent(test.id, { kind: "quiz", skillIds: ["m.frac.unit"], done: false });
    serve(
      feed([
        { uid: "u1", date: addDays(TODAY, 5), title: "Unit 3 Test" }, // moved by the teacher
        { uid: "u2", date: addDays(TODAY, 1), title: "Reading log due" },
        { date: addDays(TODAY, 4), title: "Picture day" },
        { uid: "u3", date: addDays(TODAY, 6), title: "Science lab report" }, // new
      ]),
    );
    const r = await refreshClass("p1", cls.id, TODAY);
    expect(r).toEqual({ classId: cls.id, name: "Math 6", ok: true, added: 1, updated: 1, unchanged: 2 });
    const events = eventsOf(read(), "p1");
    expect(events).toHaveLength(4);
    expect(events.find((e) => e.uid === "u1")).toMatchObject({ id: test.id, date: addDays(TODAY, 5), kind: "quiz", skillIds: ["m.frac.unit"] });
  });

  it("reports a failed refresh without touching anything, and refreshes only linked classes", async () => {
    const linked = addClass("p1", { name: "ELA", subject: "english", feedUrl: "https://school.example/ela.ics" })!;
    addClass("p1", { name: "Art", subject: "other" });
    serve({ status: 502, error: "timeout" });
    expect(await refreshAll("p1", TODAY)).toEqual([{ classId: linked.id, name: "ELA", ok: false, error: "timeout" }]);
    expect(eventsOf(read(), "p1")).toEqual([]);
    unlinkCalendar(linked.id);
    expect(await refreshAll("p1", TODAY)).toEqual([]);
    expect(await refreshClass("p1", linked.id, TODAY)).toMatchObject({ ok: false, error: "url" });
  });

  it("links an existing class instead of making one", () => {
    const cls = addClass("p1", { name: "Science", subject: "science" })!;
    const r = saveImport("p1", icsDrafts(read(), "p1", first, TODAY), "ics", { url: "https://school.example/sci.ics", classId: cls.id });
    expect(r.classId).toBe(cls.id);
    expect(classesOf(read(), "p1")).toHaveLength(1);
    expect(classesOf(read(), "p1")[0].feedUrl).toBe("https://school.example/sci.ics");
  });
});

describe("re-importing our own file", () => {
  it("leaves out items that are already on the calendar", () => {
    addEvent("p1", { title: "Book report", kind: "project", date: addDays(TODAY, 2) });
    const file = calendarFile(read(), ada, TODAY);
    const withNew = file.text.replace("END:VCALENDAR", ["BEGIN:VEVENT", "UID:x1@school", `DTSTART;VALUE=DATE:${ics(addDays(TODAY, 3))}`, "SUMMARY:Field trip", "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
    expect(icsDrafts(read(), "p1", withNew, TODAY).map((d) => d.title)).toEqual(["Field trip"]);
  });
});

describe("calendarFile", () => {
  it("exports school items from a week ago on, named for the learner without accents", () => {
    addEvent("p1", { title: "Old test", kind: "test", date: addDays(TODAY, -20) });
    addEvent("p1", { title: "Field trip", kind: "event", date: addDays(TODAY, -2) });
    addEvent("p1", { title: "Quiz, chapter 2", kind: "quiz", date: addDays(TODAY, 4), time: "09:30" });
    const file = calendarFile(read(), { ...ada, nickname: "Sofía Ruiz" }, TODAY);
    expect(file.name).toBe("kaizenedu-sofia-ruiz.ics");
    expect(file.count).toBe(2);
    expect(parseIcs(file.text).map((e) => [e.title, e.date, e.time])).toEqual([
      ["Field trip", addDays(TODAY, -2), undefined],
      ["Quiz, chapter 2", addDays(TODAY, 4), "09:30"],
    ]);
    expect(file.text).toContain(`DTSTART:${ics(addDays(TODAY, 4))}T093000`);
  });
});
