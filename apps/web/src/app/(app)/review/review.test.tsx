import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signUp } from "@/lib/auth";
import { isReviewed, previewLevel, previewSkill, reviewOf, reviewSkill, reviewState, reviewedLines } from "@/lib/review";
import { read, resetMemory, update } from "@/lib/store";
import { ENGLISH_K_4_BANKS } from "@/practice/english/early";
import { getSkill, SKILLS } from "@/practice/skills";
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
    expect(screen.getByRole("button", { name: "Copy lines" })).toBeInTheDocument();
  });
});
