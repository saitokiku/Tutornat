// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONSENT_ENFORCED } from "./policy";

// CONSENT_ENFORCED turns accounts on in production (client.ts) and stands behind every consent
// promise on screen, so it must say exactly what the code does: every learner-facing AI or voice
// route calls consentGate. This reads the routes. When a route is added, or the gate is wired in,
// it says which way the flag must move.

const SRC = path.join(process.cwd(), "src");

function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? routes(p) : e.name === "route.ts" ? [p] : [];
  });
}

/** The grown-up's own tools: they act for the account holder, never for a child. */
const GROWN_UP_ONLY = ["app/api/ai/coach/route.ts"];

/** Every file that must call consentGate: routes that call a model, and the voice token minting. */
function gated(): string[] {
  const files = routes(path.join(SRC, "app/api")).filter((f) => /\bmodel\(/.test(readFileSync(f, "utf8")));
  const voice = path.join(SRC, "lib/voice/server.ts");
  if (existsSync(voice)) files.push(voice);
  return files.filter((f) => !GROWN_UP_ONLY.some((g) => f.endsWith(g)));
}

describe("consent enforcement", () => {
  it("finds the learner-facing AI routes", () => {
    const rel = gated().map((f) => path.relative(SRC, f));
    expect(rel).toEqual(expect.arrayContaining(["app/api/tutor/route.ts", "app/api/ai/practice/route.ts"]));
    expect(rel).not.toContain("app/api/ai/coach/route.ts");
  });

  it("is claimed exactly when every one of them calls consentGate", () => {
    const missing = gated()
      .filter((f) => !/\bconsentGate\(/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f));
    if (CONSENT_ENFORCED) expect(missing, "CONSENT_ENFORCED is true, but these don't call consentGate").toEqual([]);
    else expect(missing.length, "every AI and voice route calls consentGate: set CONSENT_ENFORCED = true in policy.ts").toBeGreaterThan(0);
  });
});
