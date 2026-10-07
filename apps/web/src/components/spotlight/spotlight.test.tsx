import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentSpot, guardSpots, resetSpotlight, spot, spotSteps } from "@/lib/spotlight";
import { SpotAgain } from "./SpotAgain";
import { SpotlightLayer } from "./SpotlightLayer";
import { fakeLayout, mockMedia } from "./test-layout";

const nav = vi.hoisted(() => ({ path: "/practice/s1" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path }));

function Practice({ withHint = true }: { withHint?: boolean }) {
  return (
    <main>
      <h1 data-spot="practice.prompt">
        <span data-spot="practice.prompt.part.0">
          <span data-spot="practice.prompt.part.0.top">3</span>
          <span data-spot="practice.prompt.part.0.bottom">4</span>
        </span>
      </h1>
      <label>
        Your answer <input />
      </label>
      {withHint && (
        <button type="button" data-spot="practice.hint">
          Hint
        </button>
      )}
      <button type="button" data-spot="practice.check">
        Check
      </button>
      <svg role="img" aria-label="A number line from 0 to 1">
        {/* A tick is a vertical line: 0 wide, like the browser measures it. */}
        <g data-spot="visual.numberline.tick.3" data-spot-label="3/4" data-rect="200 100 0 14">
          <line x1="0" x2="0" y1="0" y2="10" />
        </g>
      </svg>
      <button type="button" data-spot="far" data-rect="10 2400 100 40">
        Far away
      </button>
    </main>
  );
}

const lit = (fn: () => unknown) => act(() => void fn());
const region = () => screen.queryByRole("region", { name: "From your tutor" });
const status = () => document.querySelector('[data-spot-layer] [role="status"]')!;
let undoMedia: (() => void) | null = null;

beforeEach(() => {
  fakeLayout();
  Element.prototype.scrollIntoView = vi.fn();
  nav.path = "/practice/s1";
});
afterEach(() => {
  act(() => resetSpotlight());
  undoMedia?.();
  undoMedia = null;
  vi.restoreAllMocks();
});

describe("SpotlightLayer", () => {
  it("glows the target, shows the caption beside it, announces it, and describes the target", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    const hint = screen.getByRole("button", { name: "Hint" });
    lit(() => spot("practice.hint", { say: "Tap Hint for a small nudge." }));
    expect(region()).toHaveTextContent("Tap Hint for a small nudge.");
    expect(hint).toHaveAccessibleDescription("Tap Hint for a small nudge.");
    await waitFor(() => expect(status()).toHaveTextContent("Tap Hint for a small nudge."));
    await waitFor(() => expect(document.querySelector(".kz-spot-ring")).not.toBeNull());
    expect(document.querySelector(".kz-spot-ring")).toHaveAttribute("aria-hidden", "true");
    // Pointing never takes focus.
    expect(document.activeElement).toBe(document.body);
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(region()).toBeNull();
    expect(hint).not.toHaveAttribute("aria-describedby");
    expect(currentSpot()).toBeNull();
  });

  it("is reachable from the keyboard with Alt+Shift+T, closes on Escape and gives focus back", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    const answer = screen.getByRole("textbox", { name: "Your answer" });
    await userEvent.click(answer);
    lit(() => spot("practice.check", { say: "Then check it here." }));
    expect(document.activeElement).toBe(answer);
    await userEvent.keyboard("{Alt>}{Shift>}T{/Shift}{/Alt}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Got it" }));
    await userEvent.keyboard("{Escape}");
    expect(region()).toBeNull();
    expect(document.activeElement).toBe(answer);
  });

  it("Escape anywhere closes it", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("practice.hint", { say: "Here." }));
    await userEvent.keyboard("{Escape}");
    expect(region()).toBeNull();
  });

  it("walks through steps with Back, Next and Done, and dims the rest of the page", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() =>
      spotSteps([
        { id: "practice.prompt.part.0.bottom", say: "The bottom number says how many equal parts." },
        { id: "visual.numberline.tick.3", say: "Count 3 jumps to here." },
        { id: "practice.check", say: "Then check." },
      ]),
    );
    expect(region()).toHaveTextContent("1 of 3");
    await waitFor(() => expect(status()).toHaveTextContent("Step 1 of 3: The bottom number says how many equal parts."));
    await waitFor(() => expect(document.querySelector(".kz-spot-scrim path")).not.toBeNull());
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(region()).toHaveTextContent("Count 3 jumps to here.");
    expect(region()).toHaveTextContent("2 of 3");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(region()).toHaveTextContent("1 of 3");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(region()).toBeNull();
  });

  it("works for a part of an SVG drawing, announced by its label", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("visual.numberline.tick.3", { cue: "point" }));
    await waitFor(() => expect(document.querySelector(".kz-spot-arrow")).not.toBeNull());
    await waitFor(() => expect(status()).toHaveTextContent("Look at: 3/4"));
    expect(region()).toBeNull();
    expect(screen.queryByRole("button", { name: /Show me/ })).toBeNull();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("clears when the target is removed, when the learner taps it, and on a new page", async () => {
    const { rerender } = render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("practice.hint", { say: "Tap Hint." }));
    rerender(
      <>
        <Practice withHint={false} />
        <SpotlightLayer />
      </>,
    );
    await waitFor(() => expect(region()).toBeNull());

    lit(() => spot("practice.check", { say: "Check it." }));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(region()).toBeNull();

    lit(() => spot("practice.check", { say: "Check it." }));
    nav.path = "/home";
    rerender(
      <>
        <Practice withHint={false} />
        <SpotlightLayer />
      </>,
    );
    expect(region()).toBeNull();
  });

  it("scrolls an off-screen target into view, and offers a way back when it is scrolled away", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("far"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    const back = await screen.findByRole("button", { name: "Show me (below)" });
    await userEvent.click(back);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("under reduced motion the ring is steady (no pulse class path)", async () => {
    undoMedia = mockMedia("prefers-reduced-motion");
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    expect(document.querySelector("[data-spot-layer]")).toHaveClass("kz-spot--still");
    lit(() => spot("far"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "instant" }));
  });

  it("on phones docks the caption as a bar with an arrow that shows the way", async () => {
    undoMedia = mockMedia("max-width");
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("practice.hint", { say: "Tap Hint." }));
    await waitFor(() => expect(region()).toHaveAttribute("data-dock", "bottom"));
    expect(screen.getByRole("button", { name: /^Show me \((above|below|to the left|to the right)\)$/ })).toBeInTheDocument();
  });

  it("gives K–2 learners the bigger buttons", async () => {
    render(
      <>
        <div data-band="k2">
          <button type="button" data-spot="today.next">
            Start
          </button>
        </div>
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("today.next", { say: "Tap here to start." }));
    await waitFor(() => expect(region()).toHaveAttribute("data-band", "k2"));
    expect(screen.getByRole("button", { name: "Got it" })).toHaveClass("kz-spot-btn");
  });

  it("never lights a guarded answer", () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    const release = guardSpots(["practice.check"]);
    let ok = true;
    lit(() => (ok = spot("practice.check", { say: "This one." })));
    expect(ok).toBe(false);
    expect(region()).toBeNull();
    release();
  });
});

describe("SpotAgain", () => {
  const part = (target: string) => ({ type: "tool-point_at", state: "output-available", toolCallId: `again-${target}`, input: { target, say: "Tap Hint." } });

  it("brings the pointing back, or says it is gone", async () => {
    render(
      <>
        <Practice />
        <SpotAgain part={part("practice.hint")} />
        <SpotAgain part={part("calendar.add")} />
        <SpotlightLayer />
      </>,
    );
    const [here, gone] = screen.getAllByRole("button", { name: /Show me again/ });
    await userEvent.click(here);
    expect(currentSpot()?.id).toBe("practice.hint");
    await userEvent.click(gone);
    expect(screen.getByText("That isn't on the screen any more.")).toBeInTheDocument();
  });

  it("renders nothing for other parts", () => {
    const { container } = render(<SpotAgain part={{ type: "tool-show_visual", state: "output-available", input: {} }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
