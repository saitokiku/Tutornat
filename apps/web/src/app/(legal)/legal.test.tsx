import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { resetMemory, update } from "@/lib/store";
import LegalLayout from "./layout";
import PrivacyPage from "./privacy/page";
import RetentionPage from "./retention/page";
import TermsPage from "./terms/page";

let path = "/privacy";
vi.mock("next/navigation", () => ({ usePathname: () => path }));

afterEach(() => resetMemory());

const page = (el: React.ReactNode) => render(<LegalLayout params={Promise.resolve({})}>{el}</LegalLayout>);

describe("policy pages", () => {
  it("privacy: marked as a draft, dated, with contents, every section and a contact", () => {
    path = "/privacy";
    page(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy" })).toBeInTheDocument();
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Draft, pending legal review");
    expect(note).toHaveTextContent("Draft of October 7, 2026");
    const toc = screen.getByRole("navigation", { name: "On this page" });
    const links = within(toc).getAllByRole("link");
    expect(links.length).toBe(14);
    for (const link of links) expect(document.getElementById(link.getAttribute("href")!.slice(1))).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "What goes to Anthropic (the AI tutor)" }).closest("section")).toHaveAttribute("id", "ai");
    expect(screen.getAllByRole("link", { name: "privacy@kaizenedu.net" })[0]).toHaveAttribute("href", "mailto:privacy@kaizenedu.net");
    expect(within(screen.getByRole("navigation", { name: "Policies" })).getByRole("link", { name: "Privacy" })).toHaveAttribute("aria-current", "page");
  });

  it("says plainly what goes where, and claims no certification", () => {
    page(<PrivacyPage />);
    const text = document.body.textContent!;
    expect(text).toContain("We never attach a learner's name, your name or your email to what we send an AI model or another company.");
    expect(text).toContain("a name typed into a message or a school item goes with it");
    expect(text).toContain("only the words being looked up");
    expect(text).toContain("verifiable parental consent under COPPA");
    expect(text).toMatch(/Apple or Google/);
    // Request data our host keeps, typed titles in the weekly email, and online read-aloud voices.
    expect(text).toContain("IP address");
    expect(text).toContain("the titles of upcoming tests and quizzes as you typed them");
    expect(text).toContain("online Google voice");
    expect(text).not.toMatch(/certified|compliant|guarantee|100%|military-grade|bank-level/i);
  });

  it("never claims, anywhere, that a typed name can't leave the device", () => {
    // Text goes as typed (privacy ai.2), so no sentence may promise that names never go anywhere.
    for (const [k, v] of Object.entries(en).filter(([k]) => k.startsWith("trust."))) {
      expect(v, k).not.toMatch(/never (send|sent|carried|carries) (a |learners' )?names?\b/i);
      expect(v, k).not.toMatch(/without names/i);
      expect(v, k).not.toMatch(/never your children's names/i);
    }
  });

  it("terms and retention render with their own sections", () => {
    path = "/terms";
    const { unmount } = page(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Honest records, not grades" })).toBeInTheDocument();
    unmount();
    path = "/retention";
    page(<RetentionPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Data retention" })).toBeInTheDocument();
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    expect(within(tables[0]).getByRole("rowheader", { name: "Password reset links" }).nextElementSibling).toHaveTextContent("30 minutes.");
    expect(within(tables[0]).getByRole("rowheader", { name: /^Requests to our server/ }).nextElementSibling).toHaveTextContent(/request logs/);
    expect(within(tables[1]).getAllByRole("row")).toHaveLength(5);
    // The later rows are a proposal: no period the owner hasn't set.
    expect(screen.getByRole("heading", { level: 2, name: "Once accounts are on our server (proposed)" })).toBeInTheDocument();
    expect(tables[1].textContent).not.toMatch(/\d+ (days|months)/);
  });

  it("switches to Spanish with full-name language buttons, keyboard only", async () => {
    page(<PrivacyPage />);
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: "Language" });
    expect(within(group).getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    const es = within(group).getByRole("button", { name: "Español" });
    expect(es).toHaveClass("min-h-11");
    es.focus();
    await user.keyboard("{Enter}");
    expect(es).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 1, name: "Privacidad" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Borrador, pendiente de revisión legal");
    expect(screen.getByRole("note")).toHaveTextContent("7 de octubre de 2026");
  });

  it("follows the device language saved earlier", () => {
    act(() => update((s) => void (s.prefs.locale = "es")));
    page(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Términos de uso" })).toBeInTheDocument();
  });
});

describe("policy wording", () => {
  const trust = (d: Record<string, string>) => Object.entries(d).filter(([k]) => k.startsWith("trust."));
  it("has no exclamation marks, praise or hype in either language", () => {
    for (const [k, v] of [...trust(en), ...trust(es)]) {
      expect(v, k).not.toMatch(/!|¡/);
      expect(v, k).not.toMatch(/\b(great job|awesome|amazing|revolutionary|cutting-edge|seamless|AI-powered|excelente trabajo|increíble)\b/i);
    }
  });
});
