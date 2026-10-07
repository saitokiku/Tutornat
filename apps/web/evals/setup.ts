import { vi } from "vitest";
import type { Meter, Role } from "@/lib/ai/config";

// The tutor route (app/api/tutor/route.ts) builds its model with lib/ai/config.ts `model`. While a
// conversation runs, the eval hands it its own (route-model.ts); everything else in config.ts, and
// the whole route, spend gate and tutor around it, is the real code.
vi.mock("@/lib/ai/config", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/config")>();
  const { routeModel } = await import("./route-model");
  return { ...real, model: async (role: Role, meter?: Meter) => routeModel()?.(role, meter) ?? real.model(role, meter) };
});

// On the mock the server runs as it does with a provider, spend caps included; the placeholder key
// never leaves this process, because every model call goes to the mock.
if (process.env.EVAL_REAL !== "1" && !process.env.ANTHROPIC_API_KEY && !process.env.AI_GATEWAY_API_KEY) process.env.ANTHROPIC_API_KEY = "eval-mock-never-sent";
