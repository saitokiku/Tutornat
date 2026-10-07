/**
 * Loads the tutor prompt files in this directory. They are Markdown so
 * `.claude/skills/tutor-loop/scripts/check-prompts.mjs` can lint them, and
 * they are read from disk relative to the project root the way upstream's
 * `lib/prompts/loader.ts` reads its templates. Server-only. Cached per process.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AgeBand } from '@/kaizen.config';

export type PromptFile =
  | 'persona'
  | 'band-9-12'
  | 'band-13-17'
  | 'band-adult'
  | 'band-4-8'
  | 'subjects'
  | 'coach'
  | 'safety'
  | 'safety-9-12'
  | 'crisis'
  | 'disclosure'
  | 'break'
  | 'whiteboard'
  | 'checks'
  | 'grade'
  | 'wrap'
  | 'profile'
  | 'extract'
  | 'diagnose';

export const PROMPTS_DIR = join('lib', 'tutor', 'prompts');

const cache = new Map<PromptFile, string>();

export function promptPath(name: PromptFile): string {
  return join(process.cwd(), PROMPTS_DIR, `${name}.md`);
}

export function loadPromptFile(name: PromptFile): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const text = readFileSync(promptPath(name), 'utf8').trim();
  cache.set(name, text);
  return text;
}

/** Strategy law 3: the band comes from the principal, never from the client. */
export function bandPromptFile(band: AgeBand): PromptFile {
  switch (band) {
    case '9-12':
      return 'band-9-12';
    case '13-17':
      return 'band-13-17';
    case 'adult':
      return 'band-adult';
    case '4-8':
      return 'band-4-8';
  }
}

/** The `## Spoken ...` sections of a prompt file, keyed by their heading text. */
export function spokenSections(name: PromptFile): Map<string, string> {
  const text = loadPromptFile(name);
  const sections = new Map<string, string>();
  for (const part of text.split(/^(?=##\s)/m)) {
    const match = part.match(/^##\s+Spoken\s*\(([^)]*)\)\s*\n([\s\S]*)$/i);
    if (match) sections.set((match[1] ?? '').trim(), (match[2] ?? '').trim());
  }
  return sections;
}

/** Tests only. */
export function clearPromptCacheForTests(): void {
  cache.clear();
}
