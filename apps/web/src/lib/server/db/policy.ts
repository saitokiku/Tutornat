import type { Grade } from "@/lib/types";

// Parent-first consent: who may turn on the AI tutor and voice for a child, and when that counts.
// Pure and shared by the browser and the server, so a screen and the server always decide alike.
// This is plumbing, not legal text: the notice lives on /privacy, and counsel decides which
// verification methods satisfy COPPA before any is marked `verified`.

export const CONSENT_SCOPES = ["ai", "voice"] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

/** The notice a consent was given against. Bump it when /privacy changes in a way consent depends on. */
export const CONSENT_NOTICE_VERSION = "2026-10-07-draft";

/**
 * Whether every learner-facing AI and voice route refuses a learner without consent (consentGate in
 * consent.ts). Until it is true, consent records would promise something nothing enforces, so a
 * production deployment keeps families in the browser (client.ts serverMode) and development says so
 * on the consent page. consent-wiring.test.ts reads the routes and fails when this disagrees with them.
 */
export const CONSENT_ENFORCED = false;

/** The active learner a session reports when the grown-up is using the app themselves. */
export const PARENT_LEARNER = "parent";

/** The only method that exists without a vendor: for building and testing, never for real children. */
export const DEV_METHOD = "dev-not-verified";
/** The signed-in account holder confirms. Not verifiable consent, so it only counts for learners 13 or older. */
export const PARENT_METHOD = "parent-confirmed";

/** A stored consent and the receipt a grown-up sees. */
export type ConsentReceipt = {
  id: string;
  profileId: string;
  method: string;
  /** The method verified the grown-up (a vendor's check). Never true for the two built-in methods. */
  verified: boolean;
  scope: ConsentScope[];
  noticeVersion: string;
  /** Whether the learner is under 13, as the grown-up said (or the grade implies). */
  under13: boolean;
  grantedAt: number;
  revokedAt?: number;
  /** The account email that gave it. */
  grantedBy: string;
  /** The account holder typed the account password to give it. */
  passwordConfirmed?: boolean;
};

const UNDER_13_GRADES: Grade[] = ["K", "1", "2", "3", "4", "5", "6", "7"];

/** K–7 are treated as under 13 whatever anyone says; 8 and 9 depend on the child; adults are adults. */
export function gradeAge(grade: Grade): "under13" | "ask" | "adult" {
  if (grade === "adult") return "adult";
  return UNDER_13_GRADES.includes(grade) ? "under13" : "ask";
}

export const needsConsent = (grade: Grade) => grade !== "adult";

/** Whether this receipt switches `scope` on for a learner in this grade. */
export function receiptCounts(r: ConsentReceipt, grade: Grade, scope: ConsentScope, production: boolean): boolean {
  if (r.revokedAt || !r.scope.includes(scope)) return false;
  const under13 = gradeAge(grade) === "under13" || r.under13;
  if (!under13) return true;
  if (r.verified) return true;
  // Without a verified method an under-13 learner stays off in production. Development may test the flow.
  return !production && r.method === DEV_METHOD;
}

export function consentAllows(p: { grade: Grade; receipts: ConsentReceipt[]; scope: ConsentScope; production: boolean }): boolean {
  if (!needsConsent(p.grade)) return true;
  return p.receipts.some((r) => receiptCounts(r, p.grade, p.scope, p.production));
}
