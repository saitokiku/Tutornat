import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bandOf } from "@/catalogue";
import { update } from "@/lib/store";
import { GRADES } from "@/lib/types";
import { Announcer, Toaster } from "./kit/announce";
import {
  BandSync,
  Button,
  ConfirmButton,
  Dialog,
  Field,
  IconButton,
  Meter,
  Notice,
  ProgressBar,
  Row,
  RowList,
  Segmented,
  Sheet,
  Skeleton,
  Stat,
  StatGroup,
  Tabs,
  announce,
  bandFor,
  btn,
  toast,
} from "./ui";

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.band;
});

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

  it("small buttons keep a 44px target on touch", () => {
    expect(btn("secondary", "sm")).toContain("pointer-coarse:min-h-11");
    expect(btn("primary")).toBe("k-btn-primary");
  });

  it("Notice: a problem is an alert, everything else a status", () => {
    const { rerender } = render(<Notice tone="bad">Couldn&apos;t save</Notice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
    rerender(<Notice tone="good">Saved</Notice>);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("IconButton is named by its label", () => {
    render(<IconButton label="Read aloud" icon={<svg />} />);
    expect(screen.getByRole("button", { name: "Read aloud" })).toHaveAttribute("title", "Read aloud");
  });
});

function DialogHarness({ sheet = false }: { sheet?: boolean }) {
  const [open, setOpen] = useState(false);
  const Overlay = sheet ? Sheet : Dialog;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Overlay open={open} onClose={() => setOpen(false)} title="Rename course" description="Short names read best.">
        <label>
          Name <input />
        </label>
      </Overlay>
    </>
  );
}

describe("Dialog and Sheet", () => {
  it("opens labelled, focuses its title, closes on Escape and returns focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    const dialog = document.querySelector("dialog")!;
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleName("Rename course");
    expect(dialog).toHaveAccessibleDescription("Short names read best.");
    expect(screen.getByRole("heading", { name: "Rename course" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(dialog).not.toHaveAttribute("open");
    expect(opener).toHaveFocus();
  });

  it("closes from its labelled close button", async () => {
    const user = userEvent.setup();
    render(<DialogHarness sheet />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = document.querySelector("dialog.k-sheet")!;
    expect(dialog).toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});

describe("Tabs", () => {
  const items = [
    { id: "math", label: "Math" },
    { id: "science", label: "Science" },
    { id: "english", label: "English" },
  ];

  it("is one tab stop; arrows, Home and End move and select", async () => {
    const user = userEvent.setup();
    render(<Tabs label="Subjects" items={items}>{(id) => <p>Panel {id}</p>}</Tabs>);
    const [math, science, english] = screen.getAllByRole("tab");
    expect(math).toHaveAttribute("aria-selected", "true");
    expect(science).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel math");

    await user.tab();
    expect(math).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(science).toHaveFocus();
    expect(science).toHaveAttribute("aria-selected", "true");
    expect(science).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Science");
    await user.keyboard("{End}");
    expect(english).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(math).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(english).toHaveAttribute("aria-selected", "true");
  });
});

describe("Segmented", () => {
  it("behaves as a radio group", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Segmented
        label="Show"
        options={[
          { value: "week", label: "Week" },
          { value: "day", label: "Day" },
        ]}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Show" })).toBeInTheDocument();
    const week = screen.getByRole("radio", { name: "Week" });
    expect(week).toBeChecked();
    week.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Day" })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("day");
  });
});

describe("ConfirmButton", () => {
  it("asks in place; Escape puts it back and returns focus", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm}>Delete note</ConfirmButton>);
    await user.click(screen.getByRole("button", { name: "Delete note" }));
    expect(screen.getByRole("button", { name: "Yes, delete" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete note" })).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("ProgressBar and Meter", () => {
  it("say the real count to people and screen readers", () => {
    render(
      <>
        <ProgressBar value={3} max={10} label="Problems answered" />
        <Meter value={12} max={15} high={10} label="Minutes today" />
      </>,
    );
    const bar = screen.getByRole("progressbar", { name: "Problems answered" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuetext", "3 of 10");
    expect(screen.getByText("3 of 10")).toBeInTheDocument();
    const meter = screen.getByRole("meter", { name: "Minutes today" });
    expect(meter).toHaveAttribute("aria-valuetext", "12 of 15");
    expect(screen.getByText("12 of 15")).toHaveClass("text-warn");
  });
});

describe("Row, Stat, Skeleton", () => {
  it("a linked row opens its item and keeps its action separate", () => {
    render(
      <RowList label="Today">
        <Row title="Adjectives" meta="8 min" href="/practice/a" action={<button type="button">Start</button>} />
      </RowList>,
    );
    expect(screen.getByRole("list", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adjectives" })).toHaveAttribute("href", "/practice/a");
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByText("8 min")).toHaveClass("font-opmono");
  });

  it("a stat is a term and its figure", () => {
    render(
      <StatGroup>
        <Stat label="Lessons finished" value={4} />
      </StatGroup>,
    );
    expect(screen.getByRole("term")).toHaveTextContent("Lessons finished");
    expect(screen.getByRole("definition")).toHaveTextContent("4");
  });

  it("a skeleton is hidden from screen readers unless labelled", () => {
    const { container } = render(<Skeleton lines={3} label="Loading…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(container.querySelectorAll(".k-skeleton")).toHaveLength(3);
  });
});

describe("announce and toast", () => {
  it("writes to the polite region after a beat, assertive for problems", () => {
    vi.useFakeTimers();
    render(<Announcer />);
    announce("Saved");
    act(() => vi.advanceTimersByTime(100));
    expect(document.getElementById("k-live-polite")).toHaveTextContent("Saved");
    announce("Couldn't save", { assertive: true });
    act(() => vi.advanceTimersByTime(100));
    expect(document.getElementById("k-live-assertive")).toHaveTextContent("Couldn't save");
  });

  it("a toast shows the message and announces it", () => {
    vi.useFakeTimers();
    render(
      <>
        <Announcer />
        <Toaster />
      </>,
    );
    let dismiss = () => {};
    act(() => {
      dismiss = toast("Note added", { tone: "good" });
    });
    expect(screen.getByRole("region", { name: "Messages" })).toHaveTextContent("Note added");
    act(() => vi.advanceTimersByTime(100));
    expect(document.getElementById("k-live-polite")).toHaveTextContent("Note added");
    act(() => {
      dismiss();
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("region", { name: "Messages" })).not.toBeInTheDocument();
  });
});

describe("K–2 band", () => {
  it("bandFor matches the catalogue's bands for every grade", () => {
    for (const g of GRADES) expect(bandFor(g)).toBe(bandOf(g));
  });

  it("BandSync puts the current learner's band on <html> and clears it for grown-ups", () => {
    render(<BandSync />);
    act(() => {
      update((s) => {
        s.accounts.push({ id: "a1" } as never);
        s.profiles.push({ id: "p1", accountId: "a1", nickname: "Leo", grade: "K", locale: "en", color: "#000", createdAt: 0 });
        s.session = { accountId: "a1", profileId: "p1" };
      });
    });
    expect(document.documentElement.dataset.band).toBe("k2");
    act(() => {
      update((s) => {
        s.session = { accountId: "a1", profileId: "parent" };
      });
    });
    expect(document.documentElement.dataset.band).toBeUndefined();
  });
});
