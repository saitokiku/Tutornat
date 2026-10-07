import type { Instrumentation } from "next";
import { logRequestError } from "@/lib/server/log";

// Server errors become one structured, scrubbed log line (lib/server/log.ts): route, method, error and
// a request id; never the request body, headers, query values, names or transcripts.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  logRequestError(err, request, context);
};
