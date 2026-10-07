import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeLayout } from "@/components/spotlight/test-layout";
import {
  clearSpot,
  currentSpot,
  guardSpots,
  holdSpot,
  isSpotId,
  resetSpotlight,
  resolveSpot,
  scrubNames,
  setSpotScrub,
  spot,
  spotAttr,
  spotSteps,
  SPOT_MS,
  stepSpot,
  visibleSpots,
} from "./spotlight";

const page = (html: string) => {
  document.body.innerHTML = html;
};
const el = (id: string) => document.querySelector(`[data-spot="${id}"]`)!;
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  fakeLayout();
});
afterEach(() => {
  resetSpotlight();
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("spot ids", () => {
  it("are lowercase dotted, at most 64 characters, and validated before use", () => {
    for (const ok of ["practice.hint", "visual.numberline.tick.3", "practice.prompt.part.2", "nav.calendar", "a", "x".repeat(64)]) expect(isSpotId(ok), ok).toBe(true);
    for (const bad of ["Practice.Hint", ".hint", "-x", "a b", "a>b", '[data-spot="x"]', "x".repeat(65), "", 3, null]) expect(isSpotId(bad), String(bad)).toBe(false);
  });

  it("spotAttr marks an element, and refuses bad or reserved ids", () => {
    expect(spotAttr("practice.hint")).toEqual({ "data-spot": "practice.hint" });
    expect(spotAttr("visual.numberline.tick.3", "3")).toEqual({ "data-spot": "visual.numberline.tick.3", "data-spot-label": "3" });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(spotAttr("Bad Id")).toEqual({});
    expect(spotAttr("auto.button.x")).toEqual({});
    expect(error).toHaveBeenCalledTimes(2);
  });
});

describe("visibleSpots", () => {
  it("lists marked targets first, then visible controls and headings with stable auto ids", () => {
    page(`
      <h1>Fractions</h1>
      <button>Check</button>
      <button data-spot="practice.hint">Hint</button>
      <a href="/calendar">Calendar</a>
      <button>Check</button>
      <input aria-label="Your answer" value="secret 42" />
      <div role="slider" aria-label="Parts" tabindex="0"></div>
      <div tabindex="0">Card</div>
      <span data-spot="practice.prompt.part.0.bottom">8</span>
    `);
    expect(visibleSpots()).toEqual([
      { id: "practice.hint", name: "Hint" },
      { id: "practice.prompt.part.0.bottom", name: "8" },
      { id: "auto.heading.fractions", name: "Fractions" },
      { id: "auto.button.check", name: "Check" },
      { id: "auto.link.calendar", name: "Calendar" },
      { id: "auto.button.check-2", name: "Check" },
      { id: "auto.textbox.your-answer", name: "Your answer" },
      { id: "auto.slider.parts", name: "Parts" },
      { id: "auto.control.card", name: "Card" },
    ]);
  });

  it("skips hidden, inert, aria-hidden, zero-size, unnamed and ignored elements", () => {
    page(`
      <button hidden>Hidden</button>
      <div inert><button>Inert</button></div>
      <div aria-hidden="true"><button data-spot="x.aria">Aria</button></div>
      <button data-rect="0 0 0 0">Collapsed</button>
      <button style="visibility:hidden">Invisible</button>
      <button aria-label=""></button>
      <div tabindex="-1">Not focusable</div>
      <div data-spot-ignore><button>Chat send</button></div>
      <a href="/x"><h3>Inside a link</h3></a>
      <button>Seen</button>
    `);
    expect(visibleSpots().map((s) => s.id)).toEqual(["auto.link.inside-a-link", "auto.button.seen"]);
  });

  it("never reads what was typed: fields are named by their labels", () => {
    page(`<label for="a">Notes</label><textarea id="a">my secret</textarea><div role="textbox" contenteditable="true" tabindex="0">typed words</div>`);
    const names = visibleSpots().map((s) => s.name);
    expect(names).toEqual(["Notes"]);
    expect(JSON.stringify(visibleSpots())).not.toMatch(/secret|typed/);
  });

  it("never reads what was typed into a field inside its own label, or into a select, or an editable part", () => {
    // React mirrors a controlled textarea's value into a child text node, like this.
    page(`
      <label>Notes <textarea>Ada lives at 12 Oak St</textarea></label>
      <label>Pet <select><option>Rex the dog</option></select></label>
      <button aria-labelledby="l">x</button><span id="l">Draft <span contenteditable="true">my diary</span></span>
    `);
    expect(visibleSpots()).toEqual([
      { id: "auto.textbox.notes", name: "Notes" },
      { id: "auto.combobox.pet", name: "Pet" },
      { id: "auto.button.draft", name: "Draft" },
    ]);
  });

  it("lights a visually hidden field through its label, and skips one with nothing to show", () => {
    page(`
      <label data-rect="10 10 80 40"><input type="radio" name="l" class="peer sr-only" data-rect="10 10 1 1" /><span>Español</span></label>
      <input type="file" aria-label="Choose a file" data-rect="0 0 1 1" />
      <h2 data-rect="0 0 1 1">Only for screen readers</h2>
    `);
    expect(visibleSpots()).toEqual([{ id: "auto.radio.espanol", name: "Español" }]);
    expect(resolveSpot("auto.radio.espanol")).toBe(document.querySelector("label"));
  });

  it("trims names to 60 characters and puts what is on screen first, capped", () => {
    page(`<button data-rect="10 2000 100 40">Below the fold</button><button>${"Long label ".repeat(10)}</button>`);
    const spots = visibleSpots();
    expect(spots[0].name).toHaveLength(60);
    expect(spots[0].name.endsWith("…")).toBe(true);
    expect(spots[1].id).toBe("auto.button.below-the-fold");
    page(Array.from({ length: 80 }, (_, i) => `<button>B${i}</button>`).join(""));
    expect(visibleSpots()).toHaveLength(60);
    expect(visibleSpots({ cap: 5 })).toHaveLength(5);
  });

  it("scrubs learner names out of names and the ids built from them", () => {
    page(`<h1>Hi, Ada</h1><a href="/profiles">Ada's profile</a><button>Adam's book</button>`);
    setSpotScrub(scrubNames(["Ada"]));
    const spots = visibleSpots();
    expect(spots).toEqual([
      { id: "auto.heading.hi-name", name: "Hi, [name]" },
      { id: "auto.link.name-s-profile", name: "[name]'s profile" },
      { id: "auto.button.adam-s-book", name: "Adam's book" },
    ]);
    expect(JSON.stringify(spots)).not.toContain("Ada'");
    expect(resolveSpot("auto.heading.hi-name")).toBe(document.querySelector("h1"));
  });

  it("scrubs a name that markup glues to its neighbours (the app rail's profile link)", () => {
    // AppShell's rail renders exactly this: JSX keeps no space between the spans.
    page(`<a href="/profiles"><span aria-hidden="true" class="grid size-8">A</span><span class="min-w-0"><span class="block truncate">Ada</span><span class="block">Grade 3</span></span><span class="ml-auto">Switch</span></a>`);
    setSpotScrub(scrubNames(["Ada"]));
    const spots = visibleSpots();
    expect(spots).toEqual([{ id: "auto.link.name-grade-3-switch", name: "[name] Grade 3 Switch" }]);
    expect(JSON.stringify(spots).toLowerCase()).not.toContain("ada");
    expect(resolveSpot(spots[0].id)).toBe(document.querySelector("a"));
  });

  it("scrubs each word of a grown-up's name, ignoring case and accents, and names glued on in camel case or to digits", () => {
    const scrub = scrubNames(["Ada", "María López", null, " "]);
    expect(scrub("Hola, Maria. The Lopez family; MARÍA LÓPEZ")).toBe("Hola, [name]. The [name] family; [name]");
    expect(scrub("AdaGrade 3 · GradeAda · Ada3 · 3Ada · Ada's")).toBe("[name]Grade 3 · Grade[name] · [name]3 · 3[name] · [name]'s");
    // Inside another word it is a different word.
    expect(scrub("Adam's book · Canada · Mariana")).toBe("Adam's book · Canada · Mariana");
  });

  it("leaves out a control whose name still carries a learner's name the scrub could not see", () => {
    page(`<button><b>Ma</b>ria's page</button><button>Next</button>`);
    setSpotScrub(scrubNames(["Maria"]));
    expect(visibleSpots()).toEqual([{ id: "auto.button.next", name: "Next" }]);
  });

  it("resolveSpot finds every listed id again, and nothing for unknown or unsafe ids", () => {
    page(`<button>Check</button><button>Check</button><h2>Coming up</h2><svg><g data-spot="visual.numberline.tick.3"><line /></g></svg>`);
    for (const s of visibleSpots()) expect(resolveSpot(s.id), s.id).not.toBeNull();
    expect(resolveSpot("auto.button.check-2")).toBe(document.querySelectorAll("button")[1]);
    expect(resolveSpot("visual.numberline.tick.3")?.localName).toBe("g");
    expect(resolveSpot("nope")).toBeNull();
    expect(resolveSpot('"],button,["')).toBeNull();
  });
});

describe("spot", () => {
  it("lights a shown target without moving focus, and says false for anything else", () => {
    page(`<input id="answer" /><button data-spot="practice.hint">Hint</button><button data-spot="gone" hidden>x</button>`);
    const input = document.getElementById("answer") as HTMLInputElement;
    input.focus();
    expect(spot("practice.hint", { say: "Tap Hint for a nudge." })).toBe(true);
    expect(currentSpot()).toMatchObject({ id: "practice.hint", say: "Tap Hint for a nudge.", cue: "glow", dim: false });
    expect(document.activeElement).toBe(input);
    expect(spot("gone")).toBe(false);
    expect(spot("missing")).toBe(false);
    expect(spot("Bad id")).toBe(false);
    expect(currentSpot()?.id).toBe("practice.hint");
  });

  it("focuses only when asked", () => {
    page(`<button data-spot="practice.check">Check</button>`);
    spot("practice.check", { focus: true });
    expect(document.activeElement).toBe(el("practice.check"));
    expect(currentSpot()).not.toBeNull();
  });

  it("scrolls an off-screen target into view, unless the learner is typing right now", () => {
    vi.useFakeTimers();
    page(`<input id="answer" /><button data-spot="far" data-rect="10 2400 100 40">Far</button><button data-spot="near">Near</button>`);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    spot("near");
    expect(scroll).not.toHaveBeenCalled();
    spot("far");
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: "center" }));
    // The cursor sitting in a box (after sending a chat message) is not typing: it still scrolls.
    scroll.mockClear();
    const answer = document.getElementById("answer") as HTMLInputElement;
    answer.focus();
    spot("far");
    expect(scroll).toHaveBeenCalledTimes(1);
    // A key just pressed in it is.
    scroll.mockClear();
    answer.dispatchEvent(new KeyboardEvent("keydown", { key: "4", bubbles: true }));
    spot("far");
    expect(scroll).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    spot("far");
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it("counts a target under a sticky header or the tab bar as out of view, and scrolls it out", () => {
    page(`<header data-bar style="position: sticky" data-rect="0 0 1024 64">Header</header><button data-spot="under" data-rect="10 20 100 40">Under</button><nav data-bar style="position: fixed" data-rect="0 700 1024 68"><a href="/home" data-spot="nav.home" data-rect="10 710 80 48">Home</a></nav>`);
    document.elementsFromPoint = (_x: number, y: number) => [y < 100 ? document.querySelector("header")! : document.querySelector("nav")!];
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    spot("under");
    expect(scroll).toHaveBeenCalledTimes(1);
    // A tab in the tab bar is not hidden by its own bar.
    spot("nav.home");
    expect(scroll).toHaveBeenCalledTimes(1);
    delete (document as { elementsFromPoint?: unknown }).elementsFromPoint;
  });

  it("clears on Escape, on a new spot, and when the learner uses the target", () => {
    page(`<button data-spot="a">A</button><button data-spot="b">B</button>`);
    spot("a");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(currentSpot()).toBeNull();
    spot("a");
    const first = currentSpot()!.session;
    spot("b");
    expect(currentSpot()).toMatchObject({ id: "b" });
    expect(currentSpot()!.session).toBeGreaterThan(first);
    (el("b") as HTMLButtonElement).click();
    expect(currentSpot()).toBeNull();
  });

  it("one Escape closes only the spot: a drawer listening on window keeps its Escape for next time", () => {
    page(`<button data-spot="a">A</button>`);
    const drawer = vi.fn((e: KeyboardEvent) => e.key === "Escape");
    window.addEventListener("keydown", drawer);
    spot("a");
    const first = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.body.dispatchEvent(first);
    expect(currentSpot()).toBeNull();
    expect(first.defaultPrevented).toBe(true);
    expect(drawer).not.toHaveBeenCalled();
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(drawer).toHaveBeenCalledTimes(1);
    window.removeEventListener("keydown", drawer);
  });

  it("keeps a caption until the learner is done with it; a bare glow clears after SPOT_MS", () => {
    vi.useFakeTimers();
    page(`<button data-spot="a">A</button>`);
    spot("a", { say: "Tap Hint for a small nudge, then try the bottom number again." });
    vi.advanceTimersByTime(10 * 60_000);
    expect(currentSpot()).not.toBeNull();
    spot("a", { say: "Gone in a moment.", ms: 3000 });
    vi.advanceTimersByTime(3000);
    expect(currentSpot()).toBeNull();
  });

  it("times out after SPOT_MS, waits while held, and can stay until dismissed", () => {
    vi.useFakeTimers();
    page(`<button data-spot="a">A</button>`);
    spot("a");
    vi.advanceTimersByTime(SPOT_MS - 10);
    holdSpot(true);
    vi.advanceTimersByTime(60_000);
    expect(currentSpot()).not.toBeNull();
    holdSpot(false);
    vi.advanceTimersByTime(3000);
    expect(currentSpot()).toBeNull();
    spot("a", { ms: 0 });
    vi.advanceTimersByTime(600_000);
    expect(currentSpot()).not.toBeNull();
  });

  it("clears when the target leaves the page, and follows it when it is re-rendered", async () => {
    page(`<main><button data-spot="a">A</button></main>`);
    spot("a");
    document.querySelector("main")!.innerHTML = `<button data-spot="a">A again</button>`;
    await settle();
    expect(currentSpot()?.target.textContent).toBe("A again");
    document.querySelector("main")!.innerHTML = "";
    await settle();
    expect(currentSpot()).toBeNull();
  });
});

describe("walkthroughs", () => {
  it("steps forward and back, skips what is gone, and finishes", () => {
    page(`<button data-spot="nav.calendar">Calendar</button><button data-spot="calendar.add">Add</button>`);
    expect(spotSteps([{ id: "nav.calendar", say: "Your calendar lives here." }, { id: "missing", say: "x" }, { id: "calendar.add", say: "Add the test date here." }])).toBe(true);
    expect(currentSpot()).toMatchObject({ id: "nav.calendar", index: 0, dim: true });
    stepSpot(1);
    expect(currentSpot()).toMatchObject({ id: "calendar.add", index: 2, say: "Add the test date here." });
    stepSpot(-1);
    expect(currentSpot()).toMatchObject({ index: 0 });
    stepSpot(1);
    stepSpot(1);
    expect(currentSpot()).toBeNull();
  });

  it("never times out, and moves on when the learner uses the step's target", () => {
    vi.useFakeTimers();
    page(`<button data-spot="a">A</button><button data-spot="b">B</button>`);
    spot("a", { say: "First", steps: [{ id: "b", say: "Then" }] });
    vi.advanceTimersByTime(60_000);
    expect(currentSpot()).toMatchObject({ id: "a" });
    (el("a") as HTMLButtonElement).click();
    vi.advanceTimersByTime(200);
    expect(currentSpot()).toMatchObject({ id: "b" });
  });

  it("moves on when using a step replaces its target (Add turns into the form)", async () => {
    page(`<main><button data-spot="calendar.add">Add</button></main>`);
    el("calendar.add").addEventListener("click", () => {
      document.querySelector("main")!.innerHTML = `<form><label>Title <input data-spot="calendar.form.title" /></label></form>`;
    });
    spotSteps([{ id: "calendar.add", say: "Tap Add." }, { id: "calendar.form.title", say: "Name the test here." }]);
    (el("calendar.add") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 300));
    expect(currentSpot()).toMatchObject({ id: "calendar.form.title", index: 1 });
  });

  it("moves on (rather than ending) when a step's target goes away on its own", async () => {
    page(`<main><button data-spot="a">A</button><button data-spot="b">B</button></main>`);
    spotSteps([{ id: "a", say: "One" }, { id: "b", say: "Two" }]);
    el("a").remove();
    await settle();
    expect(currentSpot()).toMatchObject({ id: "b", index: 1 });
    el("b").remove();
    await settle();
    expect(currentSpot()).toBeNull();
  });
});

describe("honesty guard", () => {
  it("refuses to light a guarded target or anything inside it, until released", () => {
    page(`<ul><li><button data-spot="practice.choice.0">1/2</button></li><li><button data-spot="practice.choice.1"><span>1/4</span></button></li></ul>`);
    const release = guardSpots(["practice.choice.1"]);
    expect(spot("practice.choice.1")).toBe(false);
    expect(spot(visibleSpots().find((s) => s.name === "1/4")?.id ?? "practice.choice.1")).toBe(false);
    expect(spot("practice.choice.0")).toBe(true);
    // The list still shows every choice: leaving one out would point at it by omission.
    expect(visibleSpots().map((s) => s.id)).toContain("practice.choice.1");
    release();
    expect(spot("practice.choice.1")).toBe(true);
  });

  it("clears a lit target that becomes guarded", () => {
    page(`<button data-spot="practice.choice.2">7</button>`);
    spot("practice.choice.2");
    guardSpots(["practice.choice.2"]);
    expect(currentSpot()).toBeNull();
    clearSpot();
  });
});
