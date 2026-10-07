import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, localDate } from "@/planner/dates";
import { parseIcs } from "@/planner/ics";
import { addClass, addEvent, classesOf, eventsOf, removeEvent, updateEvent, type Draft } from "./school";
import { read, resetMemory, update } from "./store";
import type { Course, Profile } from "./types";
import { addRequest, calendarFile, fetchCalendar, icsDrafts, matchDrafts, refreshAll, refreshClass, saveImport, uniqueUids, unlinkCalendar, weekInput, weekOf, type FeedClass } from "./week";

const NOW = new Date("2026-10-07T16:00:00").getTime();
const TODAY = localDate(NOW);
const ada: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };

type Ev = { uid?: string; date: string; title: string; rid?: string };
const feed = (events: Ev[]) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    ...events.flatMap((e) => ["BEGIN:VEVENT", ...(e.uid ? [`UID:${e.uid}`] : []), ...(e.rid ? [`RECURRENCE-ID;VALUE=DATE:${e.rid.replace(/-/g, "")}`] : []), `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `SUMMARY:${e.title}`, "END:VEVENT"]),
    "END:VCALENDAR",
  ].join("\r\n");
const ics = (date: string) => date.replace(/-/g, "");
const day = (n: number) => addDays(TODAY, n);

/** Stands in for /api/ics: answers with `body` (a calendar) or an error code. */
function serve(body: string | { status: number; error: string }) {
  const fetch = vi.fn(async () => (typeof body === "string" ? new Response(body, { headers: { "content-type": "text/calendar" } }) : Response.json({ error: body.error }, { status: body.status })));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
/** Links a new class "Math 6" to `text`, keeping the drafts `keep` says yes to (all by default). */
function link(text: string, keep: (d: Draft) => boolean = () => true) {
  const drafts = icsDrafts(read(), "p1", text, TODAY).map((d) => ({ ...d, include: keep(d) }));
  const r = saveImport("p1", drafts, "ics", { url: "https://school.example/math.ics", newClass: { name: "Math 6", subject: "math" } });
  return { ...r, cls: classesOf(read(), "p1")[0] as FeedClass };
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
    addEvent("p1", { title: "Multiplication test", kind: "test", date: day(5), skillIds: ["m.mult.facts"] });
    const week = weekOf(read(), ada, NOW, TODAY);
    expect(week.filter((d) => d.lines.some((l) => l.kind === "prep")).map((d) => d.date)).toEqual([2, 3, 4].map(day));
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

  it("never takes a kind from the object's own machinery", () => {
    for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"]) expect(addRequest(name, null), name).toEqual({ kind: undefined, date: undefined });
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

describe("uniqueUids", () => {
  it("gives a recurring event's moved instances and a repeated item their own ids", () => {
    const text = feed([
      { uid: "series", date: day(1), title: "Spelling quiz" },
      { uid: "series", rid: day(8), date: day(9), title: "Spelling quiz (moved)" },
      { uid: "twice", date: day(2), title: "Book report" },
      { uid: "twice", date: day(5), title: "Book report" },
      { uid: "same", date: day(3), title: "Field trip" },
      { uid: "same", date: day(3), title: "Field trip" },
    ]);
    expect(parseIcs(uniqueUids(text)).map((e) => e.uid)).toEqual(["series", `series#${ics(day(8))}`, "twice", `twice#${ics(day(5))}`, "same", "same"]);
    // Drafts: one per item; the same item listed twice on one day is one.
    const drafts = icsDrafts(read(), "p1", text, TODAY);
    expect(drafts.map((d) => d.key)).toEqual(["series", `series#${ics(day(8))}`, "twice", `twice#${ics(day(5))}`, "same"]);
    expect(new Set(drafts.map((d) => d.uid)).size).toBe(drafts.length);
  });

  it("keeps folded lines and other properties readable", () => {
    const text = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:a", "DTSTART;VALUE=DATE:20261012", "SUMMARY:Unit 3", " Test", "END:VEVENT", "BEGIN:VEVENT", "UID:a", "DTSTART;VALUE=DATE:20261019", "SUMMARY:Unit 4 Test", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    expect(parseIcs(uniqueUids(text))).toMatchObject([
      { uid: "a", title: "Unit 3Test", date: "2026-10-12" },
      { uid: "a#20261019", title: "Unit 4 Test", date: "2026-10-19" },
    ]);
  });
});

describe("class calendar import and refresh", () => {
  const first = feed([
    { uid: "u1", date: day(3), title: "Unit 3 Test" },
    { uid: "u2", date: day(1), title: "Reading log due" },
    { date: day(4), title: "Picture day" },
    { uid: "old", date: day(-30), title: "Long ago quiz" },
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

  it("refreshes by UID: follows the school's moves, keeps what the family set, and sends new items to review", async () => {
    const { cls } = link(first);
    const test = eventsOf(read(), "p1").find((e) => e.uid === "u1")!;
    const art = addClass("p1", { name: "Art", subject: "other" })!;
    updateEvent(test.id, { kind: "quiz", skillIds: ["m.frac.unit"], classId: art.id });
    serve(
      feed([
        { uid: "u1", date: day(5), title: "Unit 3 Test" }, // moved by the teacher
        { uid: "u2", date: day(1), title: "Reading log due" },
        { date: day(4), title: "Picture day" },
        { uid: "u3", date: day(6), title: "Fractions lab report" }, // new
      ]),
    );
    const r = await refreshClass("p1", cls.id, TODAY);
    expect(r).toMatchObject({ classId: cls.id, name: "Math 6", ok: true, updated: 1, unchanged: 2, gone: [] });
    // The new item is not saved; it comes back for review, filed under the class, its guess shown.
    expect(r.ok && r.fresh).toMatchObject([{ uid: "u3", title: "Fractions lab report", classId: cls.id, include: true, skillIds: ["m.frac.unit"] }]);
    const events = eventsOf(read(), "p1");
    expect(events).toHaveLength(3);
    // Moved, but still the family's quiz, skill and class.
    expect(events.find((e) => e.uid === "u1")).toMatchObject({ id: test.id, date: day(5), kind: "quiz", skillIds: ["m.frac.unit"], classId: art.id });
    // Reviewed and saved, it is on the calendar; the next refresh has nothing new.
    saveImport("p1", r.ok ? r.fresh : [], "ics", { url: cls.feedUrl!, classId: cls.id });
    expect(eventsOf(read(), "p1")).toHaveLength(4);
    expect(await refreshClass("p1", cls.id, TODAY)).toMatchObject({ ok: true, updated: 0, unchanged: 4, fresh: [] });
  });

  it("never brings back an item the family left out at review", async () => {
    const { cls } = link(first, (d) => d.uid !== "u2");
    expect(eventsOf(read(), "p1").map((e) => e.title)).toEqual(["Unit 3 Test", "Picture day"]);
    serve(first);
    expect(await refreshClass("p1", cls.id, TODAY)).toMatchObject({ ok: true, updated: 0, fresh: [] });
    expect(await refreshAll("p1", TODAY)).toMatchObject([{ ok: true, fresh: [] }]);
    expect(eventsOf(read(), "p1")).toHaveLength(2);
    // Linking the same calendar again shows it, unticked.
    expect(icsDrafts(read(), "p1", first, TODAY, cls.id).find((d) => d.uid === "u2")).toMatchObject({ include: false });
  });

  it("never brings back an item the family deleted", async () => {
    const { cls } = link(first);
    removeEvent(eventsOf(read(), "p1").find((e) => e.uid === "u1")!.id);
    serve(first);
    const r = await refreshClass("p1", cls.id, TODAY);
    expect(r).toMatchObject({ ok: true, updated: 0, unchanged: 2, fresh: [] });
    expect(eventsOf(read(), "p1").map((e) => e.uid)).not.toContain("u1");
  });

  it("names coming items the school took off its calendar, and leaves them on ours", async () => {
    const { cls } = link(first);
    serve(feed([{ uid: "u2", date: day(1), title: "Reading log due" }, { date: day(4), title: "Picture day" }]));
    const r = await refreshClass("p1", cls.id, TODAY);
    expect(r).toMatchObject({ ok: true, gone: ["Unit 3 Test"] });
    expect(eventsOf(read(), "p1")).toHaveLength(3);
    // Still said next time, until the family deletes it or the day passes.
    expect(await refreshClass("p1", cls.id, TODAY)).toMatchObject({ ok: true, gone: ["Unit 3 Test"] });
    expect(await refreshClass("p1", cls.id, day(4))).toMatchObject({ ok: true, gone: [] });
  });

  it("refreshes a feed that repeats a UID without flip-flopping", async () => {
    const repeats = feed([
      { uid: "w", date: day(1), title: "Weekly quiz" },
      { uid: "w", date: day(8), title: "Weekly quiz" },
    ]);
    const { cls, added } = link(repeats);
    expect(added).toBe(2);
    serve(repeats);
    expect(await refreshClass("p1", cls.id, TODAY)).toMatchObject({ ok: true, updated: 0, unchanged: 2, fresh: [] });
    expect(await refreshClass("p1", cls.id, TODAY)).toMatchObject({ ok: true, updated: 0, unchanged: 2, fresh: [] });
    expect(eventsOf(read(), "p1").map((e) => e.date)).toEqual([day(1), day(8)]);
  });

  it("keeps an empty calendar's link for later", () => {
    const r = saveImport("p1", [], "ics", { url: "https://school.example/new-term.ics", newClass: { name: "Science", subject: "science" } });
    expect(classesOf(read(), "p1")).toMatchObject([{ id: r.classId, name: "Science", feedUrl: "https://school.example/new-term.ics" }]);
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

  it("forgets what a link showed when the link is forgotten", () => {
    const { cls } = link(first, (d) => d.uid !== "u2");
    expect((classesOf(read(), "p1")[0] as FeedClass).seenUids).toContain("u2");
    unlinkCalendar(cls.id);
    expect(classesOf(read(), "p1")[0]).not.toHaveProperty("seenUids");
  });

  it("links an existing class instead of making one", () => {
    const cls = addClass("p1", { name: "Science", subject: "science" })!;
    const r = saveImport("p1", icsDrafts(read(), "p1", first, TODAY), "ics", { url: "https://school.example/sci.ics", classId: cls.id });
    expect(r.classId).toBe(cls.id);
    expect(classesOf(read(), "p1")).toHaveLength(1);
    expect(classesOf(read(), "p1")[0].feedUrl).toBe("https://school.example/sci.ics");
  });
});

describe("pasted text brought in again", () => {
  const paste = (title: string, date: string): Draft => ({ key: title, title, date, kind: "test", skillIds: [], include: true });

  it("finds last week's items instead of adding them twice", () => {
    const once = matchDrafts(read(), "p1", [paste("Unit 3 Test", day(4)), paste("Spelling quiz", day(2))]);
    expect(saveImport("p1", once, "paste")).toMatchObject({ added: 2, unchanged: 0 });
    const again = matchDrafts(read(), "p1", [paste("Unit 3 Test", day(4)), paste("Book report", day(9))]);
    expect(saveImport("p1", again, "paste")).toMatchObject({ added: 1, updated: 0, unchanged: 1 });
    expect(eventsOf(read(), "p1").map((e) => e.title)).toEqual(["Spelling quiz", "Unit 3 Test", "Book report"]);
    // Spacing and capitals don't make it a new item; the name follows the latest text.
    expect(saveImport("p1", matchDrafts(read(), "p1", [paste("unit 3  TEST", day(4))]), "paste")).toMatchObject({ added: 0, updated: 1 });
    expect(eventsOf(read(), "p1")).toHaveLength(3);
  });

  it("matches an item typed by hand on the same day, keeping its type and skills", () => {
    const typed = addEvent("p1", { title: "Unit 3 Test", kind: "quiz", date: day(4), skillIds: ["m.frac.unit"] })!;
    const [d] = matchDrafts(read(), "p1", [paste("unit 3 test", day(4))]);
    expect(d).toMatchObject({ kind: "quiz", skillIds: ["m.frac.unit"] });
    saveImport("p1", [d], "paste");
    expect(eventsOf(read(), "p1")).toMatchObject([{ id: typed.id, uid: d.uid, kind: "quiz" }]);
    // From then on, the import's id finds it.
    expect(saveImport("p1", matchDrafts(read(), "p1", [paste("unit 3 test", day(4))]), "paste")).toMatchObject({ added: 0, unchanged: 1 });
  });

  it("drops a line pasted twice", () => {
    expect(matchDrafts(read(), "p1", [paste("Unit 3 Test", day(4)), paste("Unit 3 test", day(4))])).toHaveLength(1);
  });
});

describe("re-importing our own file", () => {
  it("leaves out items that are already on the calendar", () => {
    addEvent("p1", { title: "Book report", kind: "project", date: day(2) });
    const file = calendarFile(read(), ada, TODAY);
    const withNew = file.text.replace("END:VCALENDAR", ["BEGIN:VEVENT", "UID:x1@school", `DTSTART;VALUE=DATE:${ics(day(3))}`, "SUMMARY:Field trip", "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
    expect(icsDrafts(read(), "p1", withNew, TODAY).map((d) => d.title)).toEqual(["Field trip"]);
  });
});

describe("calendarFile", () => {
  it("exports school items from a week ago on, named for the learner without accents", () => {
    addEvent("p1", { title: "Old test", kind: "test", date: day(-20) });
    addEvent("p1", { title: "Field trip", kind: "event", date: day(-2) });
    addEvent("p1", { title: "Quiz, chapter 2", kind: "quiz", date: day(4), time: "09:30" });
    const file = calendarFile(read(), { ...ada, nickname: "Sofía Ruiz" }, TODAY);
    expect(file.name).toBe("kaizenedu-sofia-ruiz.ics");
    expect(file.count).toBe(2);
    expect(parseIcs(file.text).map((e) => [e.title, e.date, e.time])).toEqual([
      ["Field trip", day(-2), undefined],
      ["Quiz, chapter 2", day(4), "09:30"],
    ]);
    expect(file.text).toContain(`DTSTART:${ics(day(4))}T093000`);
  });
});
