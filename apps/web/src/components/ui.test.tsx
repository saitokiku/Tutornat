import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, Field } from "./ui";

describe("ui", () => {
  it("Field links its error to the control", () => {
    render(<Field label="Email" hint="We never share it" error="Enter an email">{(a) => <input {...a} />}</Field>);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter an email");
  });

  it("Button in loading state is disabled and busy", () => {
    render(<Button loading>Save</Button>);
    const b = screen.getByRole("button", { name: "Save" });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
  });
});
