import type { LanguageModel } from "ai";
import type { Meter, Role } from "@/lib/ai/config";

// The model the tutor route gets from lib/ai/config.ts `model` while the eval is driving it (see
// setup.ts): the mock, or the real provider wrapped to record what it is sent.

type Make = (role: Role, meter?: Meter) => LanguageModel;
let current: Make | null = null;

export const routeModel = () => current;

/** Runs `fn` with the route's model made by `make`, then puts the real one back. */
export async function withRouteModel<T>(make: Make, fn: () => Promise<T>): Promise<T> {
  current = make;
  try {
    return await fn();
  } finally {
    current = null;
  }
}
