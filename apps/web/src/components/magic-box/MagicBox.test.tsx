import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addFiles, CAPS } from "@/lib/files";
import { read } from "@/lib/store";
import type { Profile } from "@/lib/types";
import { GOAL_MAX, MagicBox } from "./MagicBox";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const learner: Profile = { id: "p1", accountId: "a1", nickname: "Ada", grade: "4", locale: "en", color: "#000", createdAt: 0 };
const submit = () => screen.getByRole("button", { name: /Build my course/ });

describe("MagicBox", () => {
  it("keeps submit disabled until there are 3 characters", async () => {
    render(<MagicBox learner={learner} />);
    expect(submit()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("What do you want to learn?"), "ab");
    expect(submit()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("What do you want to learn?"), "c");
    expect(submit()).toBeEnabled();
  });

  it("caps the goal at 2000 characters", () => {
    render(<MagicBox learner={learner} />);
    const box = screen.getByLabelText("What do you want to learn?");
    expect(box).toHaveAttribute("maxLength", String(GOAL_MAX));
    fireEvent.change(box, { target: { value: "x".repeat(GOAL_MAX) } });
    expect(screen.getByText(`${GOAL_MAX} / ${GOAL_MAX}`)).toBeInTheDocument();
  });

  it("an example chip fills the box but does not submit", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.click(screen.getByRole("button", { name: "Fractions" }));
    expect(screen.getByLabelText("What do you want to learn?")).toHaveValue("Fractions");
    expect(push).not.toHaveBeenCalled();
    expect(read().courses).toHaveLength(0);
  });

  it("submitting saves a draft and opens the outline builder", async () => {
    render(<MagicBox learner={learner} />);
    await userEvent.type(screen.getByLabelText("What do you want to learn?"), "volcanoes");
    await userEvent.click(submit());
    const draft = read().courses[0];
    expect(draft).toMatchObject({ status: "outlining", subject: "science", grade: "4", profileId: "p1" });
    expect(push).toHaveBeenCalledWith(`/courses/new/${draft.id}?fresh=1`);
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
