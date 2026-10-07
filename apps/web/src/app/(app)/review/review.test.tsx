import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/auth";
import {
  collectExtras,
  filterQuery,
  gradeSpan,
  isReviewed,
  matchingSkills,
  nextSkill,
  previewLevel,
  previewSkill,
  readFilters,
  reviewHistory,
  reviewOf,
  reviewSkill,
  reviewState,
  reviewedLines,
  strands,
  type Extras,
  type ReviewState,
} from "@/lib/review";
import { read, resetMemory, update } from "@/lib/store";
import { ENGLISH_K_4, ENGLISH_K_4_BANKS } from "@/practice/english/early";
import { BANKS } from "@/practice/english/upper";
import { STRANDS } from "@/practice/registry";
import { getSkill, gradeIndex, makeItem, SKILLS } from "@/practice/skills";
import { ReviewTool } from "./ReviewTool";

const nav = { search: "", replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => "/review",
  useRouter: () => ({ push: vi.fn(), replace: nav.replace }),
}));

afterEach(() => {
  resetMemory();
  nav.search = "";
  nav.replace.mockReset();
});

async function grownUp(email = "teacher@example.com", name = "Ms. Ruiz") {
  await signUp({ email, password: "longenough", displayName: name });
  update((s) => void (s.session.profileId = "parent"));
  return read().session.accountId!;
}

const rhyme = getSkill("e.rhyme")!;
const computed = SKILLS.find((k) => k.content === "computed")!;
const TEACHER = { teacher: true };

describe("reviewSkill and review state", () => {
  it("a teacher's approval makes a draft skill read as reviewed, and exports its line", async () => {
    const by = await grownUp();
    expect(reviewState(read(), rhyme)).toBe("draft");
    expect(isReviewed(read(), rhyme)).toBe(false);
    const r = reviewSkill("e.rhyme", "approved", "  checked both languages  ", TEACHER)!;
    expect(r).toMatchObject({ skillId: "e.rhyme", status: "approved", note: "checked both languages", by });
    resetMemory(); // persisted, not just in memory
    expect(reviewState(read(), rhyme)).toBe("approved");
    expect(isReviewed(read(), rhyme)).toBe(true);
    expect(reviewedLines(read())).toEqual(['  "e.rhyme",']);
  });

  it("only a teacher approves; anyone in the Parent view can flag with a note", async () => {
    await grownUp();
    expect(reviewSkill("e.rhyme", "approved")).toBeNull();
    expect(reviewSkill("e.rhyme", "approved", "looks fine", { teacher: false })).toBeNull();
    expect(read().reviews).toEqual([]);
    expect(isReviewed(read(), rhyme)).toBe(false);
    expect(reviewSkill("e.rhyme", "flagged", "Level 1 #2: the Spanish hint gives it away")).toMatchObject({ status: "flagged" });
  });

  it("needs a note to flag, and the newest decision wins", async () => {
    await grownUp();
    expect(reviewSkill("e.rhyme", "flagged")).toBeNull();
    expect(reviewSkill("e.rhyme", "flagged", "   ")).toBeNull();
    vi.spyOn(Date, "now").mockReturnValue(1000);
    reviewSkill("e.rhyme", "approved", undefined, TEACHER);
    vi.spyOn(Date, "now").mockReturnValue(2000);
    reviewSkill("e.rhyme", "flagged", "Level 1 #3: 'log' does not rhyme in Spanish");
    expect(reviewOf(read(), "e.rhyme")?.status).toBe("flagged");
    expect(isReviewed(read(), rhyme)).toBe(false);
    expect(reviewedLines(read())).toEqual([]);
    vi.restoreAllMocks();
  });

  it("refuses learners, signed-out sessions, computed and unknown skills", async () => {
    await grownUp();
    expect(reviewSkill(computed.id, "approved", undefined, TEACHER)).toBeNull();
    expect(reviewSkill("no.such.skill", "approved", undefined, TEACHER)).toBeNull();
    update((s) => void (s.session.profileId = "some-learner"));
    expect(reviewSkill("e.rhyme", "approved", undefined, TEACHER)).toBeNull();
    update((s) => void (s.session = { accountId: null, profileId: "parent" }));
    expect(reviewSkill("e.rhyme", "approved", undefined, TEACHER)).toBeNull();
    expect(read().reviews).toEqual([]);
    expect(reviewState(read(), computed)).toBe("computed");
  });

  it("keeps each family's decisions to itself on a shared device", async () => {
    const a = await grownUp("a@example.com", "Maria");
    reviewSkill("e.rhyme", "approved", "family A checked it", TEACHER);
    const b = await grownUp("b@example.com", "Lee");
    expect(read().session.accountId).toBe(b);
    // Family B: A's approval doesn't clear B's label, show in B's history, or land in B's lines.
    expect(isReviewed(read(), rhyme)).toBe(false);
    expect(reviewState(read(), rhyme)).toBe("draft");
    expect(reviewHistory(read(), "e.rhyme")).toEqual([]);
    expect(reviewedLines(read())).toEqual([]);
    // Back in family A, it reads as reviewed.
    update((s) => void (s.session = { accountId: a, profileId: "parent" }));
    expect(isReviewed(read(), rhyme)).toBe(true);
  });
});

describe("strands", () => {
  it("names every registry strand by subject and grade span, covering every skill once", () => {
    const list = strands();
    expect(list).toHaveLength(STRANDS.filter((x) => x.length).length);
    expect(list.flatMap((st) => st.ids).sort()).toEqual(SKILLS.map((k) => k.id).sort());
    // Skill-map order: math, then English, then science; inside a subject, by starting grade.
    const order = list.map((st) => ["math", "english", "science", "other"].indexOf(st.subject) * 100 + gradeIndex(st.from));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const english = list.find((st) => st.ids.includes("e.rhyme"))!;
    expect(english).toMatchObject({ key: ENGLISH_K_4[0].id, subject: "english", from: "K" });
    // By hand: the grade span is the lowest and highest grade in the strand.
    const grades = ENGLISH_K_4.map((k) => gradeIndex(k.grade));
    expect([gradeIndex(english.from), gradeIndex(english.to)]).toEqual([Math.min(...grades), Math.max(...grades)]);
    expect(gradeSpan({ from: "K", to: "4" })).toBe("K–4");
    expect(gradeSpan({ from: "6", to: "6" })).toBe("6");
  });
});

describe("list filters", () => {
  const states = new Map<string, ReviewState>(SKILLS.map((k) => [k.id, k.content === "computed" ? "computed" : "draft"]));
  const early = strands().find((st) => st.ids.includes("e.rhyme"))!;

  it("round-trip through the URL, leaving out defaults and ignoring junk", () => {
    const f = { subject: "english" as const, strand: early.key, show: "all" as const, q: "rhym" };
    expect(readFilters(new URLSearchParams(filterQuery(f)))).toEqual(f);
    expect(filterQuery(readFilters(new URLSearchParams()))).toBe("");
    expect(readFilters(new URLSearchParams("subject=art&show=nope&q=" + "x".repeat(200)))).toEqual({ subject: "all", strand: "all", show: "draft", q: "x".repeat(80) });
  });

  it("narrow by subject, strand, state and words, and find the next skill in the same list", () => {
    const f = { subject: "english" as const, strand: early.key, show: "draft" as const, q: "" };
    const list = matchingSkills(states, f);
    expect(list.map((k) => k.id)).toEqual(early.ids.filter((id) => getSkill(id)!.content === "draft"));
    const i = list.findIndex((k) => k.id === "e.rhyme");
    expect(nextSkill(states, f, "e.rhyme")?.id).toBe(list[i + 1]?.id);
    // A skill just approved has left the "Needs review" list; its next is still the one after it.
    const after = new Map(states).set("e.rhyme", "approved");
    expect(nextSkill(after, f, "e.rhyme")?.id).toBe(list[i + 1]?.id);
    expect(nextSkill(states, f, list.at(-1)!.id)).toBeUndefined();
    expect(matchingSkills(states, { ...f, strand: "all", q: "RHYM" }).map((k) => k.id)).toContain("e.rhyme");
  });
});

describe("previewLevel", () => {
  // Independent route: the K–4 English banks are exported, so the number of distinct questions per
  // level is known exactly. Drawing seeds must find every one of them, in both languages.
  const distinct = (id: string, level: number) => new Set(ENGLISH_K_4_BANKS[id][level - 1].map((e) => JSON.stringify(e))).size;

  it.each(Object.keys(ENGLISH_K_4_BANKS))("finds every question of %s", (id) => {
    const skill = getSkill(id)!;
    for (let level = 1; level <= skill.levels; level++) {
      const lv = previewLevel(id, level);
      expect(lv.complete, `${id} L${level}`).toBe(true);
      expect(lv.pairs.length, `${id} L${level}`).toBe(distinct(id, level));
      const prompts = new Set(ENGLISH_K_4_BANKS[id][level - 1].map((e) => e.en.say));
      for (const p of lv.pairs) expect(prompts.has(p.en.say), p.en.say).toBe(true);
    }
  });

  it("pairs each English question with the Spanish one from the same seed", () => {
    const lv = previewLevel("e.rhyme", 1);
    const bySay = new Map(ENGLISH_K_4_BANKS["e.rhyme"][0].map((e) => [e.en.say, e.es.say]));
    for (const p of lv.pairs) expect(p.es.say).toBe(bySay.get(p.en.say));
  });

  it("shows each question of a level with pooled wrong choices once, with every wrong choice the pool can offer", () => {
    // Level 2 of e.fallacies shows the right name with three of the seven others, so one question has
    // dozens of versions. Independent route: the bank lists the questions, and the fallacies it names.
    const lv = previewLevel("e.fallacies", 2);
    const bank = BANKS.FALLACIES[1];
    expect(lv.complete).toBe(true);
    expect(lv.pairs).toHaveLength(new Set(bank.map((e) => e.en[0])).size);
    const named = new Set(BANKS.FALLACIES.flat().map((e) => e.en[1])).size;
    for (const p of lv.pairs) {
      expect(p.versions, p.en.say).toBeGreaterThan(1);
      for (const side of ["en", "es"] as const) {
        const labels = new Set([...p[side].choices!, ...p.others[side].choices].map((c) => c.label));
        expect(labels.size, `${side}: ${p.en.say}`).toBe(named);
      }
    }
    // Fixed-choice banks have one version per question and nothing extra.
    const empty = (x: Extras) => !x.choices.length && !x.wrong.length && !x.hints.length && !x.steps.length;
    expect(previewLevel("e.rhyme", 1).pairs.every((p) => p.versions === 1 && empty(p.others.en) && empty(p.others.es))).toBe(true);
  });

  it("gathers hints, steps, wrong answers and differently-tagged choices that only other versions have", () => {
    const shown = makeItem("e.rhyme", 1, 1, "en");
    const extra: Extras = { choices: [], wrong: [], hints: [], steps: [] };
    // The same version again adds nothing.
    expect(collectExtras(extra, shown, shown)).toBe(false);
    const label = shown.choices![0].label;
    const variant = {
      ...shown,
      hints: [...shown.hints, "A hint only this version gives"],
      steps: ["A different first step", ...shown.steps.slice(1)],
      wrong: [{ value: "cat", why: "sounds-alike" }],
      choices: [{ ...shown.choices![0], why: "a-new-tag" }, ...shown.choices!.slice(1)],
    };
    expect(collectExtras(extra, shown, variant)).toBe(true);
    expect(extra.hints).toEqual(["A hint only this version gives"]);
    expect(extra.steps).toEqual(shown.steps[0] === "A different first step" ? [] : ["A different first step"]);
    expect(extra.wrong).toEqual([{ value: "cat", why: "sounds-alike" }]);
    expect(extra.choices).toEqual([expect.objectContaining({ label, why: "a-new-tag" })]);
    // Seen once, never twice.
    expect(collectExtras(extra, shown, variant)).toBe(false);
  });

  it("sees every level of every draft bank in full, hint and step wording that varies included", () => {
    // e.fallacies' second hint lists the definitions of the choices on screen, so it varies with every
    // set of choices; by sentence, each definition is shown once and drawing still finishes.
    for (const k of SKILLS.filter((s) => s.content === "draft"))
      for (let level = 1; level <= k.levels; level++) expect(previewLevel(k.id, level).complete, `${k.id} L${level}`).toBe(true);
    const named = new Set(BANKS.FALLACIES.flat().map((e) => e.en[1])).size;
    for (const p of previewLevel("e.fallacies", 2).pairs) {
      const definitions = [...p.en.hints, ...p.others.en.hints].join(" ");
      expect(definitions.match(/\b[A-Z][a-z]+(?: [a-z]+)*: /g)?.length ?? 0, p.en.say).toBeGreaterThanOrEqual(named);
    }
  });

  it("takes samples of computed skills and stops at the cap for number-made levels", () => {
    expect(previewSkill(computed).every((lv) => lv.pairs.length === 3 && !lv.complete)).toBe(true);
    const capped = previewLevel(computed.id, 1, { cap: 50 });
    expect(capped.drawn).toBe(50);
    expect(capped.complete).toBe(false);
  });
});

describe("ReviewTool", () => {
  it("lists drafts, opens one, and a teacher approves it with the keyboard only", async () => {
    await grownUp();
    const user = userEvent.setup();
    const { unmount } = render(<ReviewTool />);
    expect(screen.getByRole("heading", { level: 1, name: "Review questions" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: /Skills/ });
    expect(within(list).getByRole("link", { name: /Rhyming words/ })).toHaveAttribute("href", "/review?skill=e.rhyme");
    // Computed skills are not in the default "Needs review" list.
    expect(within(list).queryByRole("link", { name: new RegExp(computed.title.en) })).toBeNull();
    unmount();

    nav.search = "skill=e.rhyme";
    render(<ReviewTool />);
    const heading = screen.getByRole("heading", { level: 1, name: rhyme.title.en });
    expect(heading).toHaveFocus();
    expect(screen.getByText("Nobody has reviewed this skill yet.")).toBeInTheDocument();
    expect(screen.getAllByText(/every one this level asks/)).toHaveLength(rhyme.levels);
    expect(screen.getAllByRole("group", { name: "English" }).length).toBeGreaterThan(5);
    expect(screen.getAllByRole("group", { name: "Spanish" }).length).toBeGreaterThan(5);
    expect(screen.getAllByText("Key").length).toBeGreaterThan(5);
    // How each question is answered, in words rather than a code name.
    expect(screen.getAllByText("Picking a choice").length).toBeGreaterThan(5);

    // Focus starts on the heading; the next stops are the note, the teacher box, Approve, then Flag.
    await user.tab();
    const note = screen.getByLabelText("Note");
    expect(note).toHaveFocus();
    await user.tab();
    const teacher = screen.getByRole("checkbox", { name: /I'm a teacher/ });
    expect(teacher).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Flag for changes" })).toHaveFocus();
    // Flag without a note: refused, and focus goes to the note so the reason is read out.
    await user.keyboard("{Enter}");
    expect(screen.getByText("Write what needs changing before you flag it.")).toBeInTheDocument();
    expect(note).toHaveFocus();
    expect(note).toHaveAttribute("aria-invalid", "true");
    expect(read().reviews).toEqual([]);
    await user.keyboard("Checked levels 1 and 2");
    // Approve without saying they're a teacher: refused, focus on the box.
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Approve both languages" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/Only a teacher can approve/)).toBeInTheDocument();
    expect(teacher).toHaveFocus();
    expect(read().reviews).toEqual([]);
    await user.keyboard(" ");
    expect(teacher).toBeChecked();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/no longer shows for this skill for this family's learners/)).toBeInTheDocument();
    expect(reviewOf(read(), "e.rhyme")).toMatchObject({ status: "approved", note: "Checked levels 1 and 2" });
    expect(screen.getByText(/Approved .* by Ms\. Ruiz/)).toBeInTheDocument();
    // On to the next skill that still needs review.
    expect(screen.getAllByRole("link", { name: /^Next skill: / })[0].getAttribute("href")).toMatch(/^\/review\?skill=/);
  });

  it("narrows the list to one strand, keeps the filters in the URL, and carries them into a skill and back", async () => {
    await grownUp();
    const user = userEvent.setup();
    const { unmount } = render(<ReviewTool />);
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/review?subject=english", { scroll: false });
    const picker = screen.getByLabelText("Strand");
    const english = strands().filter((st) => st.subject === "english");
    // Only English strands are offered once English is picked.
    expect(within(picker).getAllByRole("option")).toHaveLength(english.length + 1);
    const early = english.find((st) => st.ids.includes("e.rhyme"))!;
    picker.focus();
    await user.selectOptions(picker, early.key);
    await user.selectOptions(screen.getByLabelText("Show"), "all");
    const query = `subject=english&strand=${encodeURIComponent(early.key)}&show=all`;
    expect(nav.replace).toHaveBeenLastCalledWith(`/review?${query}`, { scroll: false });
    const list = screen.getByRole("list", { name: /Skills/ });
    expect(within(list).getAllByRole("link")).toHaveLength(early.ids.length);
    expect(within(list).getByRole("link", { name: /Rhyming words/ })).toHaveAttribute("href", `/review?skill=e.rhyme&${query}`);
    expect(within(picker).getByRole("option", { selected: true })).toHaveTextContent(new RegExp(`^English, grades ${gradeSpan(early)} \\(${early.ids.length} skills\\)$`));
    // Picking another subject resets the strand.
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByLabelText("Strand")).toHaveValue("all");
    unmount();

    // Opening a skill from that list, then "All skills", returns to the same list.
    nav.search = `skill=e.rhyme&${query}`;
    const view = render(<ReviewTool />);
    expect(screen.getByRole("link", { name: "All skills" })).toHaveAttribute("href", `/review?${query}`);
    view.unmount();
    nav.search = query;
    render(<ReviewTool />);
    expect(screen.getByLabelText("Strand")).toHaveValue(early.key);
    expect(screen.getByLabelText("Show")).toHaveValue("all");
  });

  it("shows one version of a pooled question, with the other wrong choices and their misconception tags listed", async () => {
    await grownUp();
    nav.search = "skill=e.fallacies";
    render(<ReviewTool />);
    expect(screen.getAllByText(/^Comes in \d+ versions/).length).toBe(previewLevel("e.fallacies", 2).pairs.length);
    expect(screen.getAllByRole("heading", { level: 5, name: "Wrong choices in other versions" }).length).toBeGreaterThan(0);
    // After the last level, a way back up to the decision.
    expect(screen.getByRole("link", { name: "Back to your decision" })).toHaveAttribute("href", "#decision");
  });

  it("shows computed skills as checked by code, with no approve button", async () => {
    await grownUp();
    nav.search = `skill=${computed.id}`;
    render(<ReviewTool />);
    expect(screen.getByText(/Checked by code: answers are calculated/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve both languages" })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getAllByText("3 samples")).toHaveLength(computed.levels);
  });

  it("offers the lines for practice/reviewed.ts once something is approved", async () => {
    await grownUp();
    reviewSkill("e.rhyme", "approved", undefined, TEACHER);
    render(<ReviewTool />);
    expect(screen.getByLabelText("Approved on this device", { selector: "pre" })).toHaveTextContent('"e.rhyme",');
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "Copy lines" }));
    expect(writeText).toHaveBeenCalledWith('  "e.rhyme",');
    expect(screen.getByText("Copied")).toBeInTheDocument();
    writeText.mockRejectedValueOnce(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy lines" }));
    expect(screen.getByText(/didn't allow copying/)).toBeInTheDocument();
  });

  it("never shows another family's reviewer or notes", async () => {
    await grownUp("a@example.com", "Maria");
    reviewSkill("e.rhyme", "flagged", "A private note from family A");
    await grownUp("b@example.com", "Lee");
    nav.search = "skill=e.rhyme";
    render(<ReviewTool />);
    expect(screen.getByText("Nobody has reviewed this skill yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Maria|private note/)).toBeNull();
  });
});
