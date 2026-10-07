import { fileURLToPath } from "node:url";
import { aiMode, model, type Role } from "@/lib/ai/config";
import type { Model } from "./run";

// Mock by default; EVAL_REAL=1 uses the provider this app is configured with, read from the
// environment or apps/web/.env.local exactly as the server reads it (lib/ai/config.ts).
// EVAL_SUITE=tutor|writer|all picks what runs (default: all on the mock, tutor on a real model,
// because the writer sample is 90 courses).

export const REAL = process.env.EVAL_REAL === "1";
const SUITE = process.env.EVAL_SUITE ?? (REAL ? "tutor" : "all");
export const runs = (suite: "tutor" | "writer") => SUITE === "all" || SUITE === suite;

export async function realModel(role: Role): Promise<Model & { modelId: string }> {
  for (const file of ["../.env.local", "../.env"]) {
    try {
      process.loadEnvFile(fileURLToPath(new URL(file, import.meta.url)));
    } catch {
      // no such file
    }
  }
  if (aiMode() === "demo") throw new Error("EVAL_REAL=1 needs a provider: ANTHROPIC_API_KEY (or AI_GATEWAY_API_KEY) in the environment or in apps/web/.env.local.");
  return (await model(role)) as Model & { modelId: string };
}
