import type { Instrumentation } from "next";
import { installConsoleScrub, logRequestError } from "@/lib/server/log";

// Server errors become one structured, scrubbed log line (lib/server/log.ts): route, method, error and
// a request id; never the request body, headers, query values, names or transcripts.

/**
 * In production, everything else written to console.error / console.warn on the server goes through
 * the same scrubbing, Next's own `console.error(err)` for an uncaught error included (it runs before
 * onRequestError). Development and the build keep the readable console.
 */
export function register() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") installConsoleScrub();
}

export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  logRequestError(err, request, context);
};
