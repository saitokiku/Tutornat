import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoButton } from "./PhotoButton";

// The photo button: on a phone, the camera or the library; with a mouse, the file chooser. By keyboard
// too: the menu opens on Enter, its first choice takes focus, Escape closes it and focus returns.

function pointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: coarse && q.includes("coarse"), media: q, addEventListener() {}, removeEventListener() {} }));
}
afterEach(() => vi.unstubAllGlobals());

describe("PhotoButton", () => {
  it("on a phone offers the camera or the library, by keyboard", async () => {
    pointer(true);
    const user = userEvent.setup();
    render(<PhotoButton onFile={() => {}} />);
    const toggle = screen.getByRole("button", { name: "Photo of the problem" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Take a photo" })).toHaveFocus();
    expect(screen.getByLabelText("Take a photo")).toHaveAttribute("capture", "environment");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Take a photo" })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();

    // A tap elsewhere closes it as well.
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Choose a photo" })).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole("button", { name: "Choose a photo" })).not.toBeInTheDocument();
  });

  it("with a mouse opens the chooser straight away, images only, and hands over the picked file", async () => {
    pointer(false);
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(<PhotoButton onFile={onFile} />);
    const input = screen.getByTestId("tutor-photo") as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/*");
    const opened = vi.spyOn(input, "click");
    await user.click(screen.getByRole("button", { name: "Photo of the problem" }));
    expect(opened).toHaveBeenCalled();
    const file = new File(["x"], "worksheet.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    expect(onFile).toHaveBeenCalledWith(file);
    expect(input.value).toBe(""); // the same photo can be picked again
  });

  it("is 56px for young learners and can be turned off while busy", () => {
    pointer(false);
    const { rerender } = render(<PhotoButton onFile={() => {}} big />);
    expect(screen.getByRole("button", { name: "Photo of the problem" }).className).toContain("size-14");
    rerender(<PhotoButton onFile={() => {}} disabled />);
    expect(screen.getByRole("button", { name: "Photo of the problem" })).toBeDisabled();
  });
});
