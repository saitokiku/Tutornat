/**
 * The weekly metrics report (release checklist "Evidence and numbers"):
 * writes docs/metrics/<ISO week>.md for the Monday-to-Monday week that ended
 * most recently, from the product tables in DATABASE_URL. Run it on Mondays:
 *
 *   pnpm metrics                       # docs/metrics/2026-W36.md
 *   pnpm metrics --now 2026-09-14T09:00:00Z --out /tmp/metrics
 *
 * Every number is computed in lib/tutor/metrics/board.ts and printed here as
 * is; this file does no arithmetic. Never edit a produced file by hand.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getTutorDb, isDbConfigured } from '@/lib/tutor/db';
import { buildBoard, readBoardInput, renderBoard } from '@/lib/tutor/metrics/board';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** The host of the connection string and nothing else: no user, password or database name. */
function sourceLabel(url: string | undefined): string {
  if (!url) return 'no database';
  try {
    return new URL(url).host || 'the database';
  } catch {
    return 'the database';
  }
}

async function main(): Promise<void> {
  if (!isDbConfigured()) {
    console.error(
      'DATABASE_URL is not set; the report reads the product tables and has nothing to read.',
    );
    process.exit(2);
  }
  const nowArgument = argument('now');
  const now = nowArgument ? new Date(nowArgument) : new Date();
  if (Number.isNaN(now.getTime())) {
    console.error(`--now must be an ISO timestamp, got ${JSON.stringify(nowArgument)}`);
    process.exit(2);
  }
  const outDir = argument('out') ?? join('docs', 'metrics');

  const db = await getTutorDb();
  try {
    const input = await readBoardInput(db, now);
    const rows = buildBoard(input);
    const markdown = renderBoard(input, rows, {
      generatedAt: new Date(),
      source: sourceLabel(process.env.DATABASE_URL),
    });
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, `${input.windows.current.isoWeek}.md`);
    writeFileSync(file, markdown);
    console.log(markdown);
    console.log(`wrote ${file}`);
    const faulted = rows.filter((row) => row.status !== 'ok');
    if (faulted.length) {
      console.error(
        `${faulted.length} row(s) could not be read: ${faulted.map((row) => row.key).join(', ')}`,
      );
      process.exitCode = 1;
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
