/**
 * Shared helpers for the invariant suite (CLAUDE.md "Invariants are tests").
 * Underscore-prefixed so vitest never collects it, matching
 * tests/agent-runtime/_stage-fixtures.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import type { NextRequest } from 'next/server';

export const REPO_ROOT = process.cwd();

/** The node-postgres pool surface, backed by a single-connection PGlite. */
export class PGlitePool {
  readonly statements: string[] = [];

  constructor(readonly db: PGlite) {}

  query<TRow>(text: string, params?: unknown[]) {
    this.statements.push(text);
    return this.db.query<TRow>(text, params);
  }

  async connect() {
    return {
      query: <TRow>(text: string, params?: unknown[]) => {
        this.statements.push(text);
        return this.db.query<TRow>(text, params);
      },
      release() {},
    };
  }

  async end() {
    await this.db.close();
  }
}

export async function pglitePool(): Promise<PGlitePool> {
  const db = new PGlite();
  await db.waitReady;
  return new PGlitePool(db);
}

export interface RouteCall {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
}

/** Build the request shape upstream route tests use (`tests/api/verify-model.test.ts`). */
export function buildRequest(call: RouteCall): NextRequest {
  const headers = new Headers(call.headers ?? {});
  let body: BodyInit | undefined;
  if (call.formData) {
    body = call.formData;
  } else if (call.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(call.body);
  }
  const request = new Request(`http://localhost${call.path}`, {
    method: call.method ?? (body ? 'POST' : 'GET'),
    headers,
    body,
  });
  return request as unknown as NextRequest;
}

const DEFAULT_IGNORED_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'out', 'build']);

/** Recursively list files under `root` (repo-relative paths, forward slashes). */
export function listFiles(
  root: string,
  options: { extensions: readonly string[]; ignoreDirs?: ReadonlySet<string> } = {
    extensions: ['.ts', '.tsx'],
  },
): string[] {
  const absoluteRoot = join(REPO_ROOT, root);
  let rootStat: ReturnType<typeof statSync>;
  try {
    rootStat = statSync(absoluteRoot);
  } catch {
    return [];
  }
  if (!rootStat.isDirectory()) return [];
  const ignored = options.ignoreDirs ?? DEFAULT_IGNORED_DIRS;
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) walk(join(dir, entry.name));
        continue;
      }
      if (options.extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(relative(REPO_ROOT, join(dir, entry.name)).split('\\').join('/'));
      }
    }
  };
  walk(absoluteRoot);
  return out.sort();
}

export interface GrepHit {
  file: string;
  line: number;
  text: string;
}

export function grepFiles(files: readonly string[], pattern: RegExp): GrepHit[] {
  const hits: GrepHit[] = [];
  for (const file of files) {
    const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
    lines.forEach((text, index) => {
      if (pattern.test(text)) hits.push({ file, line: index + 1, text: text.trim() });
    });
  }
  return hits;
}

export function readRepoFile(file: string): string {
  return readFileSync(join(REPO_ROOT, file), 'utf8');
}

/** Depth-first walk over a JSON value; `visit` sees every key/value pair. */
export function walkJson(
  value: unknown,
  visit: (path: string, key: string, value: unknown) => void,
  path = '$',
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, visit, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      visit(`${path}.${key}`, key, child);
      walkJson(child, visit, `${path}.${key}`);
    }
  }
}

/** True when any argument (or nested Buffer/typed array/string) contains `marker`. */
export function argsContainBytes(args: readonly unknown[], marker: string): boolean {
  const markerBuffer = Buffer.from(marker, 'utf8');
  const seen = new Set<unknown>();
  const check = (value: unknown): boolean => {
    if (value == null || seen.has(value)) return false;
    if (typeof value === 'string') return value.includes(marker);
    if (Buffer.isBuffer(value)) return value.includes(markerBuffer);
    if (value instanceof Uint8Array) return Buffer.from(value).includes(markerBuffer);
    if (value instanceof ArrayBuffer) return Buffer.from(value).includes(markerBuffer);
    if (typeof value === 'object') {
      seen.add(value);
      return Object.values(value as Record<string, unknown>).some(check);
    }
    return false;
  };
  return args.some(check);
}
