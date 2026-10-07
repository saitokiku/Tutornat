// TEMPORARY: static renders for a visual review. Not committed.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { writeFileSync } from "node:fs";
import type { ReactNode } from "react";
import { it, vi } from "vitest";
import { CATALOGUE } from "@/catalogue";
import type { Course, Lesson, Profile } from "@/lib/types";
import { installSpeech } from "./speech-fake";
import { Stage } from "./Stage";

vi.mock("./TutorPanel", () => ({ TutorPanel: () => null }));
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return { default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement("a", { href, ...rest }, children) };
});

const OUT = "/Users/man/Documents/GitHub/Tutornat/.claude/worktrees/wf_6c7e1417-92e-35/apps/web/.next/shots";
const CSS = "/Users/man/Documents/GitHub/Tutornat/.claude/worktrees/wf_6c7e1417-92e-35/apps/web/.next/static/chunks/276a7g9n6d5dm.css";
const save = (name: string) =>
  writeFileSync(`${OUT}/${name}.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${CSS}"></head><body class="bg-paper text-ink">${document.body.innerHTML}</body></html>`);

const kid: Profile = { id: "p1", accountId: "a1", nickname: "Leo", grade: "1", locale: "en", color: "#000", createdAt: 0 };
const teen: Profile = { ...kid, grade: "7" };
const courseFor = (id: string): Course => {
  const e = CATALOGUE.find((c) => c.id === id)!;
  return { id: "c1", profileId: "p1", title: e.title, goal: e.title, subject: e.subject, grade: e.grade, locale: e.locale, origin: "catalogue", catalogueId: e.id, status: "ready", length: "short", sources: [], lessons: e.lessons, template: false, createdAt: 0, updatedAt: 0 };
};
async function at(course: Course, lesson: Lesson, learner: Profile, sceneId: string) {
  const r = render(<Stage course={course} lesson={lesson} learner={learner} />);
  while (lesson.scenes[Number(screen.getByText(/^\d+\/\d+$/, { selector: "span" }).textContent!.split("/")[0]) - 1].id !== sceneId)
    await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
  return r;
}

it("renders", async () => {
  const fake = installSpeech();
  const add = courseFor("math-add-number-line");
  const ten = add.lessons.find((l) => l.id === "jump-to-ten")!;
  let r = await at(add, ten, kid, "s7");
  await userEvent.click(screen.getByRole("button", { name: "Add a ten" }));
  save("k-placevalue");
  r.unmount();

  r = await at(add, add.lessons[0], kid, add.lessons[0].scenes[0].id);
  await userEvent.click(screen.getByRole("button", { name: "Say it with me" }));
  fake.end();
  save("k-slide-turn");
  r.unmount();

  const nl = add.lessons[0].scenes.find((s) => s.kind === "interactive")!;
  r = await at(add, add.lessons[0], kid, nl.id);
  save("k-numberline");
  r.unmount();

  const moon = courseFor("science-moon");
  const day = moon.lessons.find((l) => l.id === "moon-in-daytime")!;
  r = await at(moon, day, kid, "s7");
  await userEvent.click(screen.getByRole("button", { name: "Minute hand forward 5 minutes" }));
  save("k-clock");
  r.unmount();

  const phases = moon.lessons.find((l) => l.id === "eight-phases")!;
  r = await at(moon, phases, kid, "s4");
  save("k-sequence");
  r.unmount();

  const story = courseFor("english-story-order");
  const mine = story.lessons.find((l) => l.id === "my-story")!;
  r = await at(story, mine, kid, "s6");
  await userEvent.click(screen.getByRole("button", { name: "Add “Nia”" }));
  save("k-sentence");
  r.unmount();

  const first = story.lessons[0];
  r = await at(story, first, kid, first.scenes.find((s) => s.kind === "interactive")!.id);
  save("k-sorter");
  while (screen.queryByRole("button", { name: /^Next/ })) await userEvent.click(screen.getByRole("button", { name: /^Next/ }));
  await userEvent.click(screen.getByRole("button", { name: /Finish lesson/ }));
  save("k-finish");
  r.unmount();

  const slope = courseFor("math-slope");
  const eq = slope.lessons.find((l) => l.id === "tables-equations")!;
  r = await at(slope, eq, teen, "s7");
  await userEvent.click(screen.getByRole("button", { name: "Take 1 from the left" }));
  save("t-balance");
  r.unmount();
  fake.uninstall();
});
