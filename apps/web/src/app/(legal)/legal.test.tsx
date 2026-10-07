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
    expect(text).toContain("Learner names never go to an AI model or to any other company.");
    expect(text).toContain("only the words being looked up");
    expect(text).toContain("verifiable parental consent under COPPA");
    expect(text).toMatch(/Apple or Google/);
    expect(text).not.toMatch(/certified|compliant|guarantee|100%|military-grade|bank-level/i);
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
    expect(within(tables[1]).getAllByRole("row")).toHaveLength(5);
  });

  it("switches to Spanish with the language toggle, keyboard only", async () => {
    page(<PrivacyPage />);
    const user = userEvent.setup();
    screen.getByRole("button", { name: "es" }).focus();
    await user.keyboard("{Enter}");
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
