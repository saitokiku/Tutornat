// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiMode } from "./config";

afterEach(() => vi.unstubAllEnvs());

describe("which AI runs", () => {
  it("is demo with nothing set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL", "");
    expect(aiMode()).toBe("demo");
  });
  it("uses an Anthropic key locally, but on Vercel only when asked to", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("VERCEL", "");
    expect(aiMode()).toBe("anthropic");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("KAIZEN_AI", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    expect(aiMode()).toBe("demo");
    vi.stubEnv("KAIZEN_AI", "anthropic");
    expect(aiMode()).toBe("anthropic");
  });
  it("uses the gateway when given a gateway key or told to on Vercel", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    expect(aiMode()).toBe("gateway");
  });
});
