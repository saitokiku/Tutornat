import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { gateway, type LanguageModel } from "ai";

// Which AI runs, decided once per deployment from its environment. No silent fallback: if the
// configured provider fails, the tutor says so; it never switches to another provider on its own.
//
//   ANTHROPIC_API_KEY           → Anthropic directly (preferred)
//   AI_GATEWAY_API_KEY          → Vercel AI Gateway, Anthropic models only
//   KAIZEN_AI=gateway (Vercel)  → AI Gateway with the deployment's own OIDC token
//   none of these               → demo: the scripted tutor and template lessons
//
// Model per job, overridable: KAIZEN_MODEL_TALK, KAIZEN_MODEL_BUILD, KAIZEN_MODEL_QUICK.

export type AiMode = "anthropic" | "gateway" | "demo";
export type Role = "talk" | "build" | "quick";

export function aiMode(): AiMode {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.AI_GATEWAY_API_KEY || (process.env.KAIZEN_AI === "gateway" && process.env.VERCEL)) return "gateway";
  return "demo";
}

const DEFAULTS: Record<Role, { anthropic: string; gateway: string }> = {
  talk: { anthropic: "claude-sonnet-5-5", gateway: "anthropic/claude-sonnet-5.5" },
  build: { anthropic: "claude-opus-5-5", gateway: "anthropic/claude-opus-5.5" },
  quick: { anthropic: "claude-haiku-4-5", gateway: "anthropic/claude-haiku-4.5" },
};

const ENV: Record<Role, string> = { talk: "KAIZEN_MODEL_TALK", build: "KAIZEN_MODEL_BUILD", quick: "KAIZEN_MODEL_QUICK" };

export function model(role: Role): LanguageModel | null {
  const mode = aiMode();
  if (mode === "demo") return null;
  const override = process.env[ENV[role]];
  if (mode === "anthropic") return anthropic(override ?? DEFAULTS[role].anthropic);
  const id = override ?? DEFAULTS[role].gateway;
  // Gateway models are limited to Anthropic's, matching the product's model policy.
  return gateway(id.startsWith("anthropic/") ? id : DEFAULTS[role].gateway);
}
