import { describe, expect, it } from "vitest";
import { CASES } from "./cases";
import type { CheckId } from "./checks";
import { makeJudge } from "./judge";
import { mockTutor } from "./mock-tutor";
import { realModel, REAL, runs } from "./models";
import { ms, pct, percentile, usd, writeReport } from "./report";
import { runCase, type CaseResult } from "./run";

// The tutor eval (plan task 2.4): 40 scripted conversations, deterministic checks on every turn,
// a model judge when a real key is present, time to first words and estimated cost per turn.
// Bars (plan §6): ≥ 90% of turns pass every deterministic check on the real model (the mock is the
// reference and must pass all of them); median time to first words under 1.5 s on the real model.

const TTFT_BAR_MS = 1500;

// Failures this eval found in code outside it, with the fix requested from its owner. They count in
// the pass rate and are listed in the report; the mock run, which must otherwise be perfect, does not
// fail on them. When one starts passing the report says so, and it comes off this list.
const KNOWN: Partial<Record<CheckId, string>> = {
  "hint-advances":
    "lib/ai/tools.ts starts next_hint's ladder at the first hint on every request, so asking for another hint in a later turn repeats the first one. Fix requested: start the ladder after the next_hint calls already in the conversation.",
};

function summarize(results: CaseResult[]) {
  const turns = results.flatMap((r) => r.turns);
  const modelTurns = turns.filter((t) => t.modelCalls > 0);
  const byCheck: Partial<Record<CheckId, { pass: number; total: number }>> = {};
  for (const k of turns.flatMap((t) => t.checks)) {
    const s = (byCheck[k.id] ??= { pass: 0, total: 0 });
    s.total++;
    if (k.pass) s.pass++;
  }
  const ttft = modelTurns.flatMap((t) => (t.ttftMs === null ? [] : [t.ttftMs]));
  const judged = turns.filter((t) => t.judge);
  const cost = modelTurns.reduce((a, t) => a + t.costUsd, 0);
  return {
    conversations: results.length,
    conversationsPassing: results.filter((r) => r.pass).length,
    turns: turns.length,
    turnsPassing: turns.filter((t) => t.pass).length,
    passRate: turns.filter((t) => t.pass).length / turns.length,
    byCheck,
    ttftMedianMs: percentile(ttft, 50),
    ttftP90Ms: percentile(ttft, 90),
    costPerTurnUsd: modelTurns.length ? cost / modelTurns.length : 0,
    costTotalUsd: cost,
    judgePassRate: judged.length ? judged.filter((t) => t.judge!.pass).length / judged.length : null,
  };
}

function markdown(mode: string, results: CaseResult[], s: ReturnType<typeof summarize>) {
  const lines = [
    `# Tutor eval — ${mode}`,
    "",
    `${new Date().toISOString()}`,
    "",
    `- Turns passing every deterministic check: **${s.turnsPassing} / ${s.turns} (${pct(s.passRate)})** — bar: 90% on a real model`,
    `- Conversations passing: ${s.conversationsPassing} / ${s.conversations}`,
    `- Time to first words: median ${ms(s.ttftMedianMs)}, p90 ${ms(s.ttftP90Ms)} — bar: median under ${TTFT_BAR_MS} ms on a real model`,
    `- Estimated cost: ${usd(s.costPerTurnUsd)} per model turn, ${usd(s.costTotalUsd)} for the run`,
    `- Model judge: ${s.judgePassRate === null ? "not run (needs EVAL_REAL=1)" : pct(s.judgePassRate)}`,
    "",
    "## Known issues",
    "",
    ...Object.entries(KNOWN).map(([id, why]) => {
      const failing = s.byCheck[id as CheckId] ? s.byCheck[id as CheckId]!.total - s.byCheck[id as CheckId]!.pass : 0;
      return `- **${id}** (${failing ? `${failing} failing turn(s)` : "now passes: take it off the known list"}): ${why}`;
    }),
    "",
    "## By check",
    "",
    "| Check | Pass |",
    "|---|---|",
    ...Object.entries(s.byCheck).map(([id, v]) => `| ${id} | ${v.pass} / ${v.total} |`),
    "",
    "## Conversations",
    "",
    "| Case | Tags | Turns | First words | Cost | Result |",
    "|---|---|---|---|---|---|",
    ...results.map((r) => {
      const ttft = r.turns.flatMap((t) => (t.ttftMs === null || !t.modelCalls ? [] : [t.ttftMs]));
      const fails = r.turns.flatMap((t, i) => t.checks.filter((k) => !k.pass).map((k) => `turn ${i + 1} ${k.id}: ${k.detail ?? ""}`));
      return `| ${r.id} | ${r.tags.join(", ")} | ${r.turns.length} | ${ms(percentile(ttft, 50))} | ${usd(r.turns.reduce((a, t) => a + t.costUsd, 0))} | ${r.pass ? "pass" : `**fail** — ${fails.join("; ")}`} |`;
    }),
    "",
    "## Transcripts",
    "",
    ...results.flatMap((r) => [
      `### ${r.id} — ${r.title}`,
      "",
      ...r.turns.flatMap((t) => [
        `- **Learner:** ${t.sent}`,
        `- **Tutor:** ${t.reply || "(nothing)"}${t.tools.length ? ` _(tools: ${t.tools.map((x) => x.name).join(", ")})_` : ""}${t.flag ? ` _(safety: ${t.flag})_` : ""}`,
        ...(t.judge && !t.judge.pass ? [`- _Judge: ${t.judge.reason}_`] : []),
      ]),
      "",
    ]),
  ];
  return `${lines.join("\n")}\n`;
}

describe.skipIf(!runs("tutor"))("tutor conversations", () => {
  it("holds every reply to the tutor's rules", async () => {
    const real = REAL ? await realModel("talk") : null;
    const judge = REAL ? makeJudge(await realModel("build")) : undefined;
    const mode = real ? `real model (${real.modelId})` : "mock model (priced as claude-sonnet-5-5)";
    const results: CaseResult[] = [];
    for (const c of CASES) results.push(await runCase(c, real ?? mockTutor(), { priceAs: real ? undefined : "claude-sonnet-5-5", judge }));
    const s = summarize(results);
    const out = writeReport("tutor", { summary: { mode, ...s }, results }, markdown(mode, results, s));
    process.stdout.write(`\nTutor eval (${mode}): ${s.turnsPassing}/${s.turns} turns pass (${pct(s.passRate)}); first words median ${ms(s.ttftMedianMs)}; ${usd(s.costPerTurnUsd)} per turn. Report: ${out}tutor.md\n`);

    expect(results).toHaveLength(40);
    const failures = results.flatMap((r) => r.turns.flatMap((t, i) => t.checks.filter((k) => !k.pass).map((k) => `${r.id} turn ${i + 1} ${k.id}: ${k.detail}`)));
    if (real) {
      expect(s.passRate, failures.join("\n")).toBeGreaterThanOrEqual(0.9);
      expect(s.ttftMedianMs ?? Infinity, "median time to first words").toBeLessThan(TTFT_BAR_MS);
    } else expect(failures.filter((f) => !Object.keys(KNOWN).some((id) => f.includes(` ${id}: `)))).toEqual([]);
  });
});
