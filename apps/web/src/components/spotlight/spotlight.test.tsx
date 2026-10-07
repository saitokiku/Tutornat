import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runSpotFromToolPart } from "@/lib/ai/spot-tool";
import { currentSpot, guardSpots, resetSpotlight, setSpotBand, spot, spotSteps } from "@/lib/spotlight";
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
/** The caption is placed (measured) and takes clicks. */
const ready = () => waitFor(() => expect(region()).not.toHaveAttribute("data-ready"));
/** What covers the screen's edges, for the bar detection (jsdom has no hit testing). */
const bars = (hit: (y: number) => Element | null) => {
  document.elementsFromPoint = (_x: number, y: number) => [hit(y)].filter((e): e is Element => e !== null);
};
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
  delete (document as { elementsFromPoint?: unknown }).elementsFromPoint;
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

  it("is reachable from the keyboard with F6, shows the key to keyboard users, closes on Escape and gives focus back", async () => {
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
    expect(region()).not.toHaveTextContent("brings you here");
    await userEvent.keyboard("4");
    expect(region()).toHaveTextContent("F6 brings you here");
    await userEvent.keyboard("{F6}");
    const gotIt = screen.getByRole("button", { name: "Got it" });
    expect(document.activeElement).toBe(gotIt);
    // On the button, a screen reader hears the words too, and the key it can be reached by.
    expect(gotIt).toHaveAccessibleDescription("Then check it here.");
    expect(gotIt).toHaveAttribute("aria-keyshortcuts", "F6");
    await userEvent.keyboard("{Escape}");
    expect(region()).toBeNull();
    expect(document.activeElement).toBe(answer);
  });

  it("Escape closes the caption and nothing else: the tutor drawer behind it stays open", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    const drawer = vi.fn();
    window.addEventListener("keydown", drawer);
    lit(() => spot("practice.hint", { say: "Here." }));
    await userEvent.keyboard("{F6}");
    await userEvent.keyboard("{Escape}");
    expect(region()).toBeNull();
    lit(() => spot("practice.hint", { say: "Here." }));
    (document.activeElement as HTMLElement).blur();
    await userEvent.keyboard("{Escape}");
    expect(region()).toBeNull();
    // Two Escapes so far, each closing a caption; only the F6 reached the window.
    expect(drawer.mock.calls.filter(([e]) => (e as KeyboardEvent).key === "Escape")).toHaveLength(0);
    await userEvent.keyboard("{Escape}");
    expect(drawer.mock.calls.filter(([e]) => (e as KeyboardEvent).key === "Escape")).toHaveLength(1);
    window.removeEventListener("keydown", drawer);
  });

  it("a tap away from the caption lets go of it: its timer runs again, and focus is not pulled back", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    const answer = screen.getByRole("textbox", { name: "Your answer" });
    await userEvent.click(answer);
    lit(() => spot("practice.check", { say: "Then check it here.", ms: 300 }));
    await userEvent.keyboard("{F6}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Got it" }));
    // Held while the keyboard is in it.
    await act(() => new Promise((r) => setTimeout(r, 400)));
    expect(region()).not.toBeNull();
    // Tapping the problem's text: focus goes nowhere (relatedTarget null). The hold lets go (2.5s floor).
    await userEvent.click(screen.getByText("3"));
    expect(document.activeElement).toBe(document.body);
    await waitFor(() => expect(region()).toBeNull(), { timeout: 4000 });
    expect(document.activeElement).toBe(document.body);
  });

  it("a tap on Got it does not pull focus back into the answer field (no phone keyboard popping up)", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    const answer = screen.getByRole("textbox", { name: "Your answer" });
    await userEvent.click(answer);
    lit(() => spot("practice.check", { say: "Then check it here." }));
    await ready();
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(region()).toBeNull();
    expect(document.activeElement).not.toBe(answer);
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
    await waitFor(() => expect(status()).toHaveTextContent("Your tutor is pointing at 3/4."));
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

  it("on phones docks at the top rather than over the box the learner is typing in (the talk board)", async () => {
    undoMedia = mockMedia("max-width");
    render(
      <>
        <button type="button" data-spot="talk.board" data-rect="10 300 300 200">
          Board
        </button>
        <textarea aria-label="Say something" data-rect="10 724 300 44" />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("talk.board", { say: "The picture is up here." }));
    await waitFor(() => expect(region()).toHaveAttribute("data-dock", "top"));
  });

  it("on phones docks above a sheet that covers the bottom of the screen (the tutor drawer)", async () => {
    undoMedia = mockMedia("max-width");
    render(
      <>
        <Practice />
        <aside data-rect="0 300 1024 468" style={{ position: "fixed" }}>
          Tutor
        </aside>
        <SpotlightLayer />
      </>,
    );
    bars((y) => (y > 300 ? document.querySelector("aside") : null));
    lit(() => spot("practice.check", { say: "Then check it." }));
    // 768 (the window) − 300 (the sheet's top) + 12.
    await waitFor(() => expect(region()?.style.bottom).toBe("480px"));
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

  it("takes the band from the learner, not the target, and reads the words aloud for K–2", async () => {
    const speak = vi.fn();
    Object.assign(window, { speechSynthesis: { speak, cancel: vi.fn(), getVoices: () => [] }, SpeechSynthesisUtterance: class { constructor(public text: string) {} } });
    render(
      <>
        <nav>
          <a href="/calendar" data-spot="nav.calendar">
            Calendar
          </a>
        </nav>
        <SpotlightLayer />
      </>,
    );
    setSpotBand("k2");
    lit(() => spot("nav.calendar", { say: "Your test is on the calendar." }));
    await waitFor(() => expect(region()).toHaveAttribute("data-band", "k2"));
    await ready();
    await userEvent.click(screen.getByRole("button", { name: /^Read aloud: Your test is on the calendar/ }));
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: "Your test is on the calendar." }));
    // Grown-ups (and older learners) get no speaker.
    setSpotBand(null);
    lit(() => spot("nav.calendar", { say: "Your test is on the calendar." }));
    expect(screen.queryByRole("button", { name: /^Read aloud/ })).toBeNull();
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
  });

  it("follows a target that moves without changing size (the drawer closing, a hint appearing above it)", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("practice.hint", { say: "Tap Hint." }));
    const ring = () => document.querySelector<HTMLElement>(".kz-spot-ring");
    await waitFor(() => expect(ring()?.style.translate).toBe("4px 4px"));
    const hint = screen.getByRole("button", { name: "Hint" });
    act(() => {
      hint.setAttribute("data-rect", "210 310 100 40");
      document.querySelector("main")!.prepend(document.createElement("p"));
    });
    await waitFor(() => expect(ring()?.style.translate).toBe("204px 304px"));
  });

  it("cuts the ring where its target is cut: half under the sticky header, it disappears with it", async () => {
    render(
      <>
        <header data-rect="0 0 1024 64" style={{ position: "sticky" }}>
          Header
        </header>
        <button type="button" data-spot="practice.hint" data-rect="10 40 100 40">
          Hint
        </button>
        <SpotlightLayer />
      </>,
    );
    bars((y) => (y < 100 ? document.querySelector("header") : null));
    lit(() => spot("practice.hint"));
    // The ring box starts at 40 − 6 = 34 and the header ends at 64: its top 30px is cut. Elsewhere the
    // glow may spill 32px, except past the screen's left edge, 4px away.
    await waitFor(() => expect(document.querySelector<HTMLElement>(".kz-spot-ring")?.style.clipPath).toBe("inset(30px -32px -32px -4px)"));
  });

  it("hands the keyboard to the caption when the edge button goes away", async () => {
    render(
      <>
        <Practice />
        <SpotlightLayer />
      </>,
    );
    lit(() => spot("far", { say: "Your next step is down here." }));
    const edge = await screen.findByRole("button", { name: "Show me (below)" });
    act(() => edge.focus());
    await userEvent.keyboard("{Enter}");
    // The page scrolls it into view (faked here): the edge button goes, the caption shows.
    act(() => {
      screen.getByRole("button", { name: "Far away" }).setAttribute("data-rect", "10 400 100 40");
      window.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Show me (below)" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Got it" })));
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
  const part = (target: string, id = `again-${target}`) => ({ type: "tool-point_at", state: "output-available", toolCallId: id, input: { target, say: "This one is bigger." } });

  it("appears once the pointing has lit, brings it back, and says when the target is gone", async () => {
    const { rerender } = render(
      <>
        <Practice />
        <SpotAgain part={part("practice.hint")} />
        <SpotlightLayer />
      </>,
    );
    expect(screen.queryByRole("button", { name: /Show me again/ })).toBeNull();
    lit(() => runSpotFromToolPart(part("practice.hint")));
    const chip = screen.getByRole("button", { name: "Show me again" });
    // The caption is its description, not its text: the chat log (a live region) has already said it.
    expect(chip).toHaveAccessibleDescription("This one is bigger.");
    expect(chip).not.toHaveTextContent("bigger");
    act(() => resetSpotlight());
    await userEvent.click(chip);
    expect(currentSpot()?.id).toBe("practice.hint");
    rerender(
      <>
        <Practice withHint={false} />
        <SpotAgain part={part("practice.hint")} />
        <SpotlightLayer />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show me again" }));
    expect(screen.getByText("That isn't on the screen anymore.")).toBeInTheDocument();
  });

  it("leaves nothing for a pointing that never lit: a guarded answer looks like any other miss", () => {
    render(
      <>
        <Practice />
        <SpotAgain part={part("practice.check", "guarded")} />
        <SpotAgain part={part("calendar.add", "missing")} />
        <SpotlightLayer />
      </>,
    );
    const release = guardSpots(["practice.check"]);
    lit(() => runSpotFromToolPart(part("practice.check", "guarded")));
    lit(() => runSpotFromToolPart(part("calendar.add", "missing")));
    expect(currentSpot()).toBeNull();
    expect(screen.queryByRole("button", { name: /Show me again/ })).toBeNull();
    expect(document.body).not.toHaveTextContent("This one is bigger.");
    release();
  });

  it("stays quiet when its target has been guarded since: no glow, and no claim that it is gone", async () => {
    render(
      <>
        <Practice />
        <SpotAgain part={part("practice.check", "later")} />
        <SpotlightLayer />
      </>,
    );
    lit(() => runSpotFromToolPart(part("practice.check", "later")));
    act(() => resetSpotlight());
    const release = guardSpots(["practice.check"]);
    await userEvent.click(screen.getByRole("button", { name: "Show me again" }));
    expect(currentSpot()).toBeNull();
    expect(screen.queryByText(/isn't on the screen/)).toBeNull();
    release();
  });

  it("renders nothing for other parts", () => {
    const { container } = render(<SpotAgain part={{ type: "tool-show_visual", state: "output-available", input: {} }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
