import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PracticePage from "@/app/(app)/practice/page";
import { signUp } from "@/lib/auth";
import { createLearner, selectLearner } from "@/lib/profiles";
import { newId, read, resetMemory, update } from "@/lib/store";
import type { Grade, Profile } from "@/lib/types";
import { SKILLS } from "@/practice/skills";
import { SkillMap } from "./SkillMap";
import { isCommonCore, StandardCode } from "./StandardText";

const nav = vi.hoisted(() => ({ push: vi.fn(), params: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/practice",
  useSearchParams: () => new URLSearchParams(nav.params),
}));

const TEXT = "Explain why a fraction a/b is equivalent to a fraction (n × a)/(n × b) by using visual fraction models.";
let standardOk: boolean | "missing" = true;
beforeEach(() => {
  standardOk = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/ai/status")) return Response.json({ mode: "anthropic" });
      if (url.startsWith("/api/know/standard")) {
        if (standardOk === "missing") return Response.json({ standard: null });
        return standardOk ? Response.json({ standard: { code: "4.NF.A.1", text: TEXT, subject: "Mathematics", grade: "4", source: "Common Core State Standards" } }) : new Response("{}", { status: 502 });
      }
      return new Response("{}", { status: 404 });
    }),
  );
});
afterEach(() => {
  resetMemory();
  nav.push.mockReset();
  nav.params = "";
  vi.unstubAllGlobals();
});

async function learner(grade: Grade = "4", locale: Profile["locale"] = "en") {
  await signUp({ email: `h${Math.random().toString(36).slice(2)}@example.test`, password: "longenough", displayName: "Sam" });
  const p = createLearner({ nickname: "Ada", grade, locale }) as Profile;
  selectLearner(p.id);
  return p;
}

describe("the standard behind a skill", () => {
  it("shows the Common Core wording on tap, with its source named", async () => {
    render(<StandardCode code="4.NF.A.1" locale="en" />);
    const button = screen.getByRole("button", { name: "4.NF.A.1: show what this standard says" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText(TEXT)).toBeInTheDocument();
    expect(screen.getByText(/Common Core State Standards, 4\.NF\.A\.1/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/know/standard?q=4.NF.A.1");
  });

  it("says so when the wording does not load, and can try again", async () => {
    standardOk = false;
    await learner("4", "es");
    render(<StandardCode code="3.NF.A.2" locale="es" />);
    await userEvent.click(screen.getByRole("button", { name: "3.NF.A.2: ver qué dice este estándar" }));
    expect(await screen.findByText("El texto de este estándar no se cargó en este momento.")).toBeInTheDocument();
    standardOk = true;
    await userEvent.click(screen.getByRole("button", { name: "Intentar de nuevo" }));
    expect(await screen.findByText(TEXT)).toBeInTheDocument();
    expect(screen.getByText("El estándar está publicado en inglés.")).toBeInTheDocument();
  });

  it("says plainly when the Common Core data has no wording for a code, with nothing to retry", async () => {
    standardOk = "missing";
    render(<StandardCode code="6.RP.A.3c" locale="en" />);
    await userEvent.click(screen.getByRole("button", { name: "6.RP.A.3c: show what this standard says" }));
    expect(await screen.findByText("We couldn't find the wording of 6.RP.A.3c in the Common Core text.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("region", { name: "Standard 6.RP.A.3c" })).toHaveAttribute("aria-busy", "false");
  });

  it("only codes the lookup can resolve are buttons; science and high-school codes stay plain", () => {
    expect(["K.CC.B.5", "4.NF.A.1", "8.EE.A.1", "RF.K.3a", "L.4.2", "W.6.1", "RL.8.2"].every(isCommonCore)).toBe(true);
    expect(["K-PS2-1", "2-LS4-1", "MS-ESS2-3", "HS-PS1-7", "L.9-10.3", "RL.9-10.4", "A-REI.B.3", "F-IF.A.2"].some(isCommonCore)).toBe(false);
    for (const code of ["MS-PS1-1", "A-REI.B.3"]) {
      const { unmount } = render(<StandardCode code={code} locale="en" />);
      expect(screen.getByText(code)).toBeInTheDocument();
      expect(screen.queryByRole("button")).toBeNull();
      unmount();
    }
  });
});

describe("SkillMap", () => {
  it("explains its dots and marks draft questions until a teacher approves them", async () => {
    await learner();
    const draft = SKILLS.find((s) => s.content === "draft")!;
    const computed = SKILLS.find((s) => s.content === "computed")!;
    const onPractice = vi.fn();
    render(<SkillMap skills={[computed, draft]} statuses={{}} now={Date.now()} locale="en" near={draft.grade} onPractice={onPractice} />);
    const legend = screen.getByRole("list", { name: "What the dots mean" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Not started",
      "Practicing",
      "Check opens or is ready",
      "Passed 1 of 2 checks",
      "Proved",
      "Needs a refresh",
    ]);
    expect(screen.getAllByText("Draft questions")).toHaveLength(1);
    update((s) => void s.reviews.push({ id: newId(), skillId: draft.id, status: "approved", by: "teacher", at: Date.now() }));
    expect(await screen.findByRole("button", { name: `Practice: ${draft.title.en}` })).toBeInTheDocument();
    expect(screen.queryByText("Draft questions")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: `Practice: ${draft.title.en}` }));
    expect(onPractice).toHaveBeenCalledWith(draft.id);
  });
});

describe("Practice home", () => {
  it("subject tabs follow the arrow keys", async () => {
    await learner();
    render(<PracticePage />);
    const math = screen.getByRole("tab", { name: /Math/ });
    expect(math).toHaveAttribute("aria-selected", "true");
    math.focus();
    await userEvent.keyboard("{ArrowRight}");
    const english = screen.getByRole("tab", { name: /English/ });
    expect(english).toHaveFocus();
    expect(english).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", english.id);
    expect(screen.getByRole("heading", { name: /English map/ })).toBeInTheDocument();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Science/ })).toHaveAttribute("aria-selected", "true");
  });

  it("search lists skills first, then AI questions, labelled as AI-written", async () => {
    await learner();
    render(<PracticePage />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Find a skill to practice" }), "fraction");
    const skills = screen.getByRole("list", { name: "Skills that match" });
    expect(within(skills).getAllByRole("listitem").length).toBeGreaterThan(0);
    const ai = await screen.findByText(/Or make practice questions about “fraction”/);
    expect(skills.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Questions written by AI for this topic/)).toBeInTheDocument();
  });

  it("Up next starts a set of the right size; Find my level starts placement; nothing starts on its own", async () => {
    const p = await learner("K");
    render(<PracticePage />);
    expect(screen.getByText("6 problems · help is always there")).toBeInTheDocument();
    expect(read().sets).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /Find my level/ }));
    expect(read().sets).toEqual([expect.objectContaining({ kind: "placement", profileId: p.id })]);
    expect(nav.push).toHaveBeenLastCalledWith(`/practice/${read().sets[0].id}`);
    await userEvent.click(screen.getByRole("button", { name: /^Start/ }));
    expect(read().sets[1]).toMatchObject({ kind: "pick", skillId: "m.count.10" });
    expect(read().sets[1].slots).toHaveLength(6);
  });

  it("Practice this again shows that skill on its own subject; the other tabs keep their own Up next", async () => {
    nav.params = "again=m.frac.unit";
    await learner("4");
    render(<PracticePage />);
    const card = () => within(screen.getByRole("region", { name: /Practice this again|Up next/ }));
    expect(screen.getByRole("tab", { name: /Math/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Practice this again" })).toBeInTheDocument();
    expect(card().getByText("Name the fraction")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /English/ }));
    expect(screen.getByRole("heading", { name: "Up next" })).toBeInTheDocument();
    expect(card().getByRole("button", { name: /^Start/ })).toBeInTheDocument();
  });
});
