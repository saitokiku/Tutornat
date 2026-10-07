import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/auth";
import { gradeSpan, isReviewed, previewLevel, previewSkill, reviewOf, reviewSkill, reviewState, reviewedLines, strands } from "@/lib/review";
import { read, resetMemory, update } from "@/lib/store";
import { ENGLISH_K_4, ENGLISH_K_4_BANKS } from "@/practice/english/early";
import { BANKS } from "@/practice/english/upper";
import { STRANDS } from "@/practice/registry";
import { getSkill, gradeIndex, SKILLS } from "@/practice/skills";
import { ReviewTool } from "./ReviewTool";

const params = { skill: null as string | null };
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(params.skill ? { skill: params.skill } : {}),
  usePathname: () => "/review",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  resetMemory();
  params.skill = null;
});

async function grownUp() {
  await signUp({ email: "teacher@example.com", password: "longenough", displayName: "Ms. Ruiz" });
  update((s) => void (s.session.profileId = "parent"));
  return read().session.accountId!;
}

const rhyme = getSkill("e.rhyme")!;
const computed = SKILLS.find((k) => k.content === "computed")!;

describe("reviewSkill and review state", () => {
  it("approves a draft skill so it reads as reviewed, and exports its line", async () => {
    const by = await grownUp();
    expect(reviewState(read(), rhyme)).toBe("draft");
    expect(isReviewed(read(), rhyme)).toBe(false);
    const r = reviewSkill("e.rhyme", "approved", "  checked both languages  ")!;
    expect(r).toMatchObject({ skillId: "e.rhyme", status: "approved", note: "checked both languages", by });
    resetMemory(); // persisted, not just in memory
    expect(reviewState(read(), rhyme)).toBe("approved");
    expect(isReviewed(read(), rhyme)).toBe(true);
    expect(reviewedLines(read())).toEqual(['  "e.rhyme",']);
  });

  it("needs a note to flag, and the newest decision wins", async () => {
    await grownUp();
    expect(reviewSkill("e.rhyme", "flagged")).toBeNull();
    expect(reviewSkill("e.rhyme", "flagged", "   ")).toBeNull();
    vi.spyOn(Date, "now").mockReturnValue(1000);
    reviewSkill("e.rhyme", "approved");
    vi.spyOn(Date, "now").mockReturnValue(2000);
    reviewSkill("e.rhyme", "flagged", "Level 1 #3: 'log' does not rhyme in Spanish");
    expect(reviewOf(read(), "e.rhyme")?.status).toBe("flagged");
    expect(isReviewed(read(), rhyme)).toBe(false);
    expect(reviewedLines(read())).toEqual([]);
  });

  it("refuses learners, signed-out sessions, computed and unknown skills", async () => {
    await grownUp();
    expect(reviewSkill(computed.id, "approved")).toBeNull();
    expect(reviewSkill("no.such.skill", "approved")).toBeNull();
    update((s) => void (s.session.profileId = "some-learner"));
    expect(reviewSkill("e.rhyme", "approved")).toBeNull();
    update((s) => void (s.session = { accountId: null, profileId: "parent" }));
    expect(reviewSkill("e.rhyme", "approved")).toBeNull();
    expect(read().reviews).toEqual([]);
    expect(reviewState(read(), computed)).toBe("computed");
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
        const labels = new Set([...p[side].choices!, ...p.others[side]].map((c) => c.label));
        expect(labels.size, `${side}: ${p.en.say}`).toBe(named);
      }
    }
    // Fixed-choice banks have one version per question and nothing extra.
    expect(previewLevel("e.rhyme", 1).pairs.every((p) => p.versions === 1 && !p.others.en.length && !p.others.es.length)).toBe(true);
  });

  it("takes samples of computed skills and stops at the cap for number-made levels", () => {
    expect(previewSkill(computed).every((lv) => lv.pairs.length === 3 && !lv.complete)).toBe(true);
    const capped = previewLevel(computed.id, 1, { cap: 50 });
    expect(capped.drawn).toBe(50);
    expect(capped.complete).toBe(false);
  });
});

describe("ReviewTool", () => {
  it("lists drafts, opens one, and approves it with the keyboard only", async () => {
    await grownUp();
    const user = userEvent.setup();
    const { unmount } = render(<ReviewTool />);
    expect(screen.getByRole("heading", { level: 1, name: "Review questions" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: /Skills/ });
    expect(within(list).getByRole("link", { name: /Rhyming words/ })).toHaveAttribute("href", "/review?skill=e.rhyme");
    // Computed skills are not in the default "Needs review" list.
    expect(within(list).queryByRole("link", { name: new RegExp(computed.title.en) })).toBeNull();
    unmount();

    params.skill = "e.rhyme";
    render(<ReviewTool />);
    const heading = screen.getByRole("heading", { level: 1, name: rhyme.title.en });
    expect(heading).toHaveFocus();
    expect(screen.getByText("Nobody has reviewed this skill yet.")).toBeInTheDocument();
    expect(screen.getAllByText(/every one this level asks/)).toHaveLength(rhyme.levels);
    expect(screen.getAllByRole("region", { name: "English" }).length).toBeGreaterThan(5);
    expect(screen.getAllByRole("region", { name: "Spanish" }).length).toBeGreaterThan(5);
    expect(screen.getAllByText("Key").length).toBeGreaterThan(5);

    // Flag without a note: refused with an explanation. Then approve, by keyboard.
    // Focus starts on the heading; the next stops are the note, Approve, then Flag.
    await user.tab();
    expect(screen.getByLabelText("Note")).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "Flag for changes" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Write what needs changing before you flag it.")).toBeInTheDocument();
    expect(read().reviews).toEqual([]);
    await user.click(screen.getByLabelText("Note"));
    await user.keyboard("Checked levels 1 and 2");
    await user.tab();
    expect(screen.getByRole("button", { name: "Approve both languages" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/no longer shows for this skill/)).toBeInTheDocument();
    expect(reviewOf(read(), "e.rhyme")).toMatchObject({ status: "approved", note: "Checked levels 1 and 2" });
    expect(screen.getByText(/Approved .* by Ms\. Ruiz/)).toBeInTheDocument();
  });

  it("narrows the list to one strand", async () => {
    await grownUp();
    const user = userEvent.setup();
    render(<ReviewTool />);
    await user.click(screen.getByRole("button", { name: "English" }));
    const picker = screen.getByLabelText("Strand");
    const english = strands().filter((st) => st.subject === "english");
    // Only English strands are offered once English is picked.
    expect(within(picker).getAllByRole("option")).toHaveLength(english.length + 1);
    const early = english.find((st) => st.ids.includes("e.rhyme"))!;
    picker.focus();
    await user.selectOptions(picker, early.key);
    await user.selectOptions(screen.getByLabelText("Show"), "all");
    const list = screen.getByRole("list", { name: /Skills/ });
    expect(within(list).getAllByRole("link")).toHaveLength(early.ids.length);
    expect(within(picker).getByRole("option", { selected: true })).toHaveTextContent(new RegExp(`^English, grades ${gradeSpan(early)} \\(${early.ids.length} skills\\)$`));
    // Picking another subject resets the strand.
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByLabelText("Strand")).toHaveValue("all");
  });

  it("shows one version of a pooled question, with the other wrong choices and their misconception tags listed", async () => {
    await grownUp();
    params.skill = "e.fallacies";
    render(<ReviewTool />);
    expect(screen.getAllByText(/^Comes in \d+ versions/).length).toBe(previewLevel("e.fallacies", 2).pairs.length);
    expect(screen.getAllByRole("heading", { level: 5, name: "Wrong choices in other versions" }).length).toBeGreaterThan(0);
  });

  it("shows computed skills as checked by code, with no approve button", async () => {
    await grownUp();
    params.skill = computed.id;
    render(<ReviewTool />);
    expect(screen.getByText(/Checked by code: answers are calculated/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve both languages" })).toBeNull();
    expect(screen.getAllByText("3 samples")).toHaveLength(computed.levels);
  });

  it("offers the lines for practice/reviewed.ts once something is approved", async () => {
    await grownUp();
    reviewSkill("e.rhyme", "approved");
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
});
