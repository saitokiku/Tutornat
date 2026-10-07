import type { Key } from "@/i18n/en";
import { newId } from "./store";
import type { SourceItem } from "./types";

// Kaizen-AI's magic-box caps (modules/kaizen-ai/web/lib/intakeBatch.js BATCH_CAPS).
export const CAPS = { files: 30, fileBytes: 25 * 1024 * 1024, batchBytes: 150 * 1024 * 1024 };
export const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.md,.csv,.json";

const KINDS: Record<string, SourceItem["kind"]> = {
  pdf: "pdf", png: "image", jpg: "image", jpeg: "image", webp: "image", gif: "image",
  doc: "doc", docx: "doc", txt: "text", md: "text", csv: "text", json: "text",
};

export type FileError = { key: Key; vars?: Record<string, string | number> };

/** Accepts what fits the caps, in order, and explains every file it turns away. */
export function addFiles(existing: SourceItem[], incoming: { name: string; size: number }[]) {
  const accepted: SourceItem[] = [];
  const errors: FileError[] = [];
  let count = existing.length;
  let bytes = existing.reduce((n, f) => n + f.size, 0);
  for (const f of incoming) {
    const kind = KINDS[f.name.split(".").pop()?.toLowerCase() ?? ""];
    if (!kind) errors.push({ key: "box.badType", vars: { name: f.name } });
    else if (f.size > CAPS.fileBytes) errors.push({ key: "box.tooBig", vars: { name: f.name } });
    else if (count >= CAPS.files) errors.push({ key: "box.tooMany", vars: { max: CAPS.files } });
    else if (bytes + f.size > CAPS.batchBytes) errors.push({ key: "box.batchTooBig" });
    else {
      accepted.push({ id: newId(), name: f.name, kind, size: f.size });
      count++;
      bytes += f.size;
    }
  }
  // One "too many" line is enough.
  const seen = new Set<string>();
  return { files: [...existing, ...accepted], errors: errors.filter((e) => (e.key === "box.tooMany" ? !seen.has(e.key) && seen.add(e.key) : true)) };
}

export function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const KIND_TAG: Record<SourceItem["kind"], string> = { pdf: "PDF", image: "IMG", doc: "DOC", text: "TXT" };
