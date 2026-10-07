import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `npm run evals`: the tutor conversations and the course-writer sample, on the mock model by
// default. EVAL_REAL=1 runs them against the provider this app is configured with (see README.md).
const real = process.env.EVAL_REAL === "1";

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
      "server-only": fileURLToPath(new URL("../vitest.server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["evals/**/*.{test,eval}.ts"],
    setupFiles: ["evals/setup.ts"],
    // Conversations run one after another so latency is measured, not contended.
    fileParallelism: false,
    testTimeout: real ? 30 * 60_000 : 120_000,
  },
});
