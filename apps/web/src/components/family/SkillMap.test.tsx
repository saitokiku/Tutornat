import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import type { SkillStatus } from "@/learning/engine";
import { resetMemory } from "@/lib/store";
import { getSkill, skillsFor } from "@/practice/skills";
import { SkillMap } from "./SkillMap";

afterEach(() => resetMemory());

const NOW = new Date(2026, 9, 7, 18).getTime();
const S = "m.add.20";
const proved: SkillStatus = { skillId: S, state: "proved", level: 2, provedAt: NOW - 864e5, overdue: false, stuck: false, totals: { own: 20, helped: 0, missed: 0 } };

describe("the whole skill map", () => {
  it("folds every skill of a subject away, by grade, each with where it stands and its standard", async () => {
    render(<SkillMap subject="math" statuses={{ [S]: proved }} locale="en" now={NOW} />);
    const all = skillsFor("math");
    const summary = screen.getByText(`The whole map, ${all.length} skills`);
    expect(screen.getByText(getSkill(S)!.title.en)).not.toBeVisible();
    await userEvent.click(summary);
    const row = screen.getByText(getSkill(S)!.title.en).closest("li")!;
    expect(row).toBeVisible();
    expect(row).toHaveTextContent(/Proved/);
    if (getSkill(S)!.standard) expect(row).toHaveTextContent(`Standard ${getSkill(S)!.standard}`);
    const grade = getSkill(S)!.grade;
    const inGrade = all.filter((s) => s.grade === grade).length;
    expect(screen.getByText(`Grade ${grade}: 1 of ${inGrade} proved`)).toBeVisible();
  });
});
