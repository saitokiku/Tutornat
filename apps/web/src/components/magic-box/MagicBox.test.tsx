import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBlobs, getBlob } from "@/lib/blobs";
import { addFiles, CAPS } from "@/lib/files";
import { read, resetMemory, update } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { fromLocalDate } from "@/planner/dates";
import { GOAL_MAX, MagicBox } from "./MagicBox";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const ai = vi.hoisted(() => ({ mode: "demo" as "demo" | "anthropic" }));
vi.mock("@/lib/ai/client", () => ({ useAiMode: () => ai.mode, aiStatus: async () => ai.mode }));

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const signedIn = () =>
  update((s) => {
    s.accounts.push({ id: "a1", email: "m@example.test", displayName: "Maria", salt: "", passwordHash: "", createdAt: 0 });
    s.profiles.push(learner);
    s.session = { accountId: "a1", profileId: "p1" };
  });

beforeEach(() => signedIn());
afterEach(async () => {
  push.mockClear();
  ai.mode = "demo";
  vi.unstubAllGlobals();
  resetMemory();
  await clearBlobs();
});

describe("MagicBox as the course builder", () => {
  const submit = () => screen.getByRole("button", { name: /Build my course/ });

  it("is the default on the course builder page", () => {
    render(<MagicBox learner={learner} variant="page" />);
    expect(screen.getByLabelText("What do you want to learn?")).toBeInTheDocument();
  });

  it("keeps submit disabled until there are 3 characters", async () => {
    render(<MagicBox learner={learner} mode="course" />);
    expect(submit()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("What do you want to learn?"), "ab");
    expect(submit()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("What do you want to learn?"), "c");
    expect(submit()).toBeEnabled();
  });

  it("caps the goal at 2000 characters", () => {
    render(<MagicBox learner={learner} mode="course" />);
    const box = screen.getByLabelText("What do you want to learn?");
    expect(box).toHaveAttribute("maxLength", String(GOAL_MAX));
    fireEvent.change(box, { target: { value: "x".repeat(GOAL_MAX) } });
    expect(screen.getByText(`${GOAL_MAX} / ${GOAL_MAX}`)).toBeInTheDocument();
  });

  it("an example chip fills the box but does not submit", async () => {
    render(<MagicBox learner={learner} mode="course" />);
    await userEvent.click(screen.getByRole("button", { name: "Fractions" }));
    expect(screen.getByLabelText("What do you want to learn?")).toHaveValue("Fractions");
    expect(push).not.toHaveBeenCalled();
    expect(read().courses).toHaveLength(0);
  });

  it("submitting saves a draft and opens the outline builder", async () => {
    render(<MagicBox learner={learner} mode="course" />);
    await userEvent.type(screen.getByLabelText("What do you want to learn?"), "volcanoes");
    await userEvent.click(submit());
    const draft = read().courses[0];
    expect(draft).toMatchObject({ status: "outlining", subject: "science", grade: "4", profileId: "p1" });
    expect(push).toHaveBeenCalledWith(`/courses/new/${draft.id}?fresh=1`);
  });
});

describe("MagicBox as the universal intake", () => {
  const box = () => screen.getByLabelText("What's going on?");
  const radio = (name: string) => screen.getByRole("radio", { name });

  it("is the default on Today, and shows its guess before anything is made", async () => {
    render(<MagicBox learner={learner} />);
    expect(screen.getByText("Learn something, homework, a test, or practice.")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    await userEvent.type(box(), "fractions worksheet due Friday");
    expect(radio("Homework")).toBeChecked();
    expect(screen.getByText("Our guess: Homework, because it says “worksheet”.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Fractions worksheet");
    expect(screen.getByText("Skills it covers: Name the fraction")).toBeInTheDocument();
    expect(read().events).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("the guess row works by keyboard: Tab reaches it, arrows change it, Enter confirms", async () => {
    const user = userEvent.setup();
    render(<MagicBox learner={learner} />);
    await user.type(box(), "fractions worksheet due Friday");
    for (let i = 0; i < 10 && document.activeElement?.getAttribute("type") !== "radio"; i++) await user.tab();
    expect(radio("Homework")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(radio("Test")).toBeChecked();
    expect(radio("Test")).toHaveFocus();
    expect(screen.getByRole("button", { name: /Add test/ })).toBeInTheDocument();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(push).toHaveBeenCalled());
    const e = read().events[0];
    expect(e).toMatchObject({ profileId: "p1", kind: "test", title: "Fractions worksheet", skillIds: ["m.frac.unit"], source: "typed" });
    expect(fromLocalDate(e.date).getDay()).toBe(5);
    expect(push).toHaveBeenCalledWith(`/calendar/${e.id}`);
  });

  it("an example chip fills the box and never submits", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Multiplication quiz next Tuesday" }));
    expect(box()).toHaveValue("Multiplication quiz next Tuesday");
    expect(radio("Quiz")).toBeChecked();
    expect(push).not.toHaveBeenCalled();
  });

  it("practice opens a set on the matching skill", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.type(box(), "practice multiplication facts");
    expect(radio("Practice")).toBeChecked();
    expect(screen.getByText("A practice set on Multiplication facts to 10 × 10 (Not started).")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Start practice/ }));
    const set = read().sets[0];
    expect(set).toMatchObject({ profileId: "p1", kind: "pick", skillId: "m.mult.facts" });
    expect(push).toHaveBeenCalledWith(`/practice/${set.id}`);
  });

  it("practice on a topic the map doesn't cover goes to the practice search without AI", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.type(box(), "practice juggling");
    expect(screen.getByText(/No skill on the map matches “Juggling” yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Find practice/ }));
    expect(push).toHaveBeenCalledWith("/practice?q=Juggling");
    expect(read().sets).toHaveLength(0);
  });

  it("practice on such a topic gets labelled AI questions when AI is connected", async () => {
    ai.mode = "anthropic";
    const items = [{ prompt: "Which is a juggling pattern?", choices: ["Cascade", "Spiral", "Square"], answer: 0, hints: ["a", "b", "c"], explain: "The cascade is the basic pattern." }];
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url === "/api/ai/practice" ? { items } : {}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MagicBox learner={learner} />);
    await userEvent.type(box(), "practice juggling");
    expect(screen.getByText(/they're marked as written by AI/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Write practice questions/ }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    const set = read().sets[0];
    expect(set).toMatchObject({ topic: "Juggling", ai: items });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/ai/practice"]);
  });

  it("learn opens the course builder with the words as the goal", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.type(box(), "Why is the sky blue?");
    expect(radio("Learn")).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Build a course/ }));
    expect(push).toHaveBeenCalledWith("/courses/new?goal=Why%20is%20the%20sky%20blue%3F");
    expect(read().courses).toHaveLength(0);
  });

  it("without AI, a PDF becomes a school item the family names and dates, said honestly", async () => {
    const user = userEvent.setup();
    render(<MagicBox learner={learner} />);
    await user.upload(screen.getByLabelText("Add photo or PDF", { selector: "input" }), new File(["%PDF-1.4"], "worksheet.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("worksheet.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Reading photos and PDFs needs the AI tutor, which isn't connected here/)).toBeInTheDocument();
    expect(screen.getByText("This browser won't keep the file after the page closes.")).toBeInTheDocument();
    expect(radio("Homework")).toBeChecked();
    await user.click(screen.getByRole("button", { name: /Add homework/ }));
    expect(screen.getByText("Give it a name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(read().events).toHaveLength(0);
    await user.type(screen.getByLabelText("Name"), "Reading worksheet");
    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2026-10-09" } });
    await user.click(screen.getByRole("button", { name: /Add homework/ }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    const e = read().events[0];
    expect(e).toMatchObject({ title: "Reading worksheet", date: "2026-10-09", kind: "homework", attachment: { name: "worksheet.pdf", mediaType: "application/pdf" } });
    expect(await getBlob(e.attachment!.blobId!)).not.toBeNull();
  });

  it("a removed file is gone, and an unreadable one is explained", async () => {
    const user = userEvent.setup();
    render(<MagicBox learner={learner} />);
    const input = screen.getByLabelText("Add photo or PDF", { selector: "input" });
    await user.upload(input, new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" }));
    await user.click(await screen.findByRole("button", { name: "Remove a.pdf" }));
    expect(screen.queryByText("a.pdf")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });
    expect(await screen.findByText("Add a photo (JPG, PNG or similar) or a PDF.")).toBeInTheDocument();
  });

  it("with AI, a photo is read for its kind, name and skills — and the learner's name never leaves the device", async () => {
    ai.mode = "anthropic";
    const out = { kind: "test", title: "[name1]'s fractions test", date: null, subject: "math", topic: "fractions", skillIds: ["m.frac.equiv"], notes: ["The day isn't on the page."] };
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(out), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<MagicBox learner={learner} />);
    await user.type(box(), "Ada's sheet");
    await user.upload(screen.getByLabelText("Add photo or PDF", { selector: "input" }), new File(["%PDF-1.4"], "sheet.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("Our guess: Test, read by the AI tutor. Check it before you go on.")).toBeInTheDocument();
    expect(radio("Test")).toBeChecked();
    expect(screen.getByLabelText("Name")).toHaveValue("Ada's fractions test");
    expect(screen.getByText("The day isn't on the page.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init!.body));
    expect(url).toBe("/api/ai/extract");
    expect(body).toMatchObject({ kind: "intake", text: "[name1]'s sheet", grade: "4", locale: "en" });
    expect(body.file).toMatch(/^data:application\/pdf;base64,/);
    expect(String(init!.body)).not.toContain("Ada");
    // The day still has to come from the family.
    await user.click(screen.getByRole("button", { name: /Add test/ }));
    expect(screen.getByText("Pick a date.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Day"), { target: { value: "2026-10-16" } });
    await user.click(screen.getByRole("button", { name: /Add test/ }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(read().events[0]).toMatchObject({ kind: "test", title: "Ada's fractions test", source: "ai", skillIds: ["m.frac.equiv"] });
  });

  it("with AI, a longer typed request is read once typing pauses", async () => {
    ai.mode = "anthropic";
    const out = { kind: "quiz", title: "Unit 2 fractions quiz", date: "2026-10-16", subject: "math", topic: "fractions", skillIds: ["m.frac.unit"], notes: [] };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(out), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MagicBox learner={learner} />);
    fireEvent.change(box(), { target: { value: "Mrs. Lee says there's a short check on fractions" } });
    expect(radio("Learn")).toBeChecked();
    await waitFor(() => expect(radio("Quiz")).toBeChecked(), { timeout: 3000 });
    expect(screen.getByLabelText("Name")).toHaveValue("Unit 2 fractions quiz");
    expect(screen.getByLabelText("Day")).toHaveValue("2026-10-16");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a crisis gets the fixed reply and a note for the grown-ups, and nothing is made", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.type(box(), "i want to die");
    await userEvent.click(screen.getByRole("button", { name: /Build a course/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("988");
    await userEvent.click(screen.getByRole("button", { name: /Build a course/ }));
    expect(read().notes).toMatchObject([{ profileId: "p1", from: "safety" }]);
    expect(push).not.toHaveBeenCalled();
    expect(read().events).toHaveLength(0);
  });
});

describe("addFiles", () => {
  it("turns away the 31st file, oversized files and unknown types, with reasons", () => {
    const thirty = Array.from({ length: CAPS.files }, (_, i) => ({ name: `p${i}.pdf`, size: 1000 }));
    const r = addFiles([], [...thirty, { name: "extra.pdf", size: 1000 }, { name: "huge.pdf", size: CAPS.fileBytes + 1 }, { name: "song.mp3", size: 10 }]);
    expect(r.files).toHaveLength(30);
    expect(r.errors.map((e) => e.key)).toEqual(["box.tooMany", "box.tooBig", "box.badType"]);
  });
});
