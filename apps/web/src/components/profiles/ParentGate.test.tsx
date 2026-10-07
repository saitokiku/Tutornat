import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { read } from "@/lib/store";
import { ParentGate } from "./ParentGate";

describe("ParentGate", () => {
  it("only lets someone through who knows the product", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 6 × 6
    const onPass = vi.fn();
    render(<ParentGate onPass={onPass} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText("What is 6 × 6?"), "35");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onPass).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Not quite");
    await userEvent.type(screen.getByLabelText("What is 6 × 6?"), "36");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onPass).toHaveBeenCalledOnce();
    expect(read().session.unlocked).toBe(true);
  });
});
