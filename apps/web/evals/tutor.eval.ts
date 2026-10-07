import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CASES } from "./cases";
import type { CheckId } from "./checks";
import { makeJudge } from "./judge";
import { mockTutor } from "./mock-tutor";
import { realModel, REAL, runs } from "./models";
import { ms, pct, percentile, usd, writeReport } from "./report";
import { runCase, type CaseResult } from "./run";

// The tutor eval (plan task 2.4): 45 scripted conversations, deterministic checks on every turn,
// a model judge when a real key is present, time to first words and estimated cost per turn.
// Bars (plan §6): ≥ 90% of turns pass every deterministic check on the real model (the mock is the
// reference and must pass all of them, known issues below aside); median time to first words under
// 1.5 s on the real model.

const TTFT_BAR_MS = 1500;

// Failures this eval found in code outside it, with the fix requested from its owner. They count in
// the pass rate and are listed in the report; the mock run, which must otherwise be perfect, does not
// fail on them. When one starts passing the report says so, and it comes off this list.
const KNOWN: Partial<Record<CheckId, string>> = {
  "hint-advances":
    "lib/ai/tools.ts starts next_hint's ladder at the first hint on every request, so asking for another hint in a later turn repeats the first one. Fix requested: start the ladder after the next_hint calls already in the conversation.",
};

// The conversations go through the browser's own aiFetch code. Whether each product screen actually
// sends through it is read from the screen's source, so the report can't claim a property the
// product doesn't have yet. Requests to the owners are filed; each line flips when its change lands.
const WIRING: { file: string; what: string; needs: string[] }[] = [
  { file: "src/components/tutor/TutorChat.tsx", what: "Tutor messages carry the opaque ids and leave out family names (transport fetch: aiFetch)", needs: ["aiFetch"] },
  { file: "src/components/tutor/TutorChat.tsx", what: "Over a cap the tutor switches to the demo tutor (useAiBudget)", needs: ["useAiBudget"] },
  { file: "src/lib/generate.ts", what: "Course requests carry the ids and leave out names (aiFetch)", needs: ["aiFetch"] },
  { file: "src/lib/generate.ts", what: "The course screen shows the cap message (error \"budget\" with its message)", needs: ['"budget"'] },
  { file: "src/lib/practice.ts", what: "AI-written questions: ids, names out, and the cap message (aiFetch, capNotice)", needs: ["aiFetch", "capNotice"] },
  { file: "src/components/calendar/ImportPanel.tsx", what: "Reading school papers: ids, names out, and the cap message (aiFetch, capNotice)", needs: ["aiFetch", "capNotice"] },
  { file: "src/components/family/CoachNote.tsx", what: "The weekly note: ids, names out, and the cap message (aiFetch, capNotice)", needs: ["aiFetch", "capNotice"] },
];

function wiring() {
  return WIRING.map((w) => {
    let source = "";
    try {
      source = readFileSync(new URL(`../${w.file}`, import.meta.url), "utf8");
    } catch {
      // moved or renamed: reported as not wired
    }
    return { ...w, wired: w.needs.every((n) => source.includes(n)) };
  });
}

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

type Wiring = ReturnType<typeof wiring>;
type Today = { turns: number; leaked: number } | null;

function markdown(mode: string, real: boolean, results: CaseResult[], s: ReturnType<typeof summarize>, wired: Wiring, today: Today) {
  const lines = [
    `# Tutor eval — ${mode}`,
    "",
    `${new Date().toISOString()}`,
    "",
    `- Turns passing every deterministic check: **${s.turnsPassing} / ${s.turns} (${pct(s.passRate)})** — bar: 90% on a real model`,
    `- Conversations passing: ${s.conversationsPassing} / ${s.conversations}`,
    `- Time to first words: median ${ms(s.ttftMedianMs)}, p90 ${ms(s.ttftP90Ms)} — bar: median under ${TTFT_BAR_MS} ms on a real model`,
    real
      ? `- Estimated cost: ${usd(s.costPerTurnUsd)} per model turn, ${usd(s.costTotalUsd)} for the run, from the provider's token counts at list price`
      : `- Mock token counts, not a cost estimate: ${usd(s.costPerTurnUsd)} per model turn if the prompt and tool definitions were billed at four characters a token. Run with EVAL_REAL=1 for real numbers.`,
    `- Model judge: ${s.judgePassRate === null ? "not run (needs EVAL_REAL=1)" : pct(s.judgePassRate)}`,
    "",
    "Each conversation goes through the chat transport TutorChat uses, sending with the browser's own aiFetch code (sendAi), into the real tutor route: spend gate, rate limit, safety screen, tools, streaming.",
    "",
    "## In the product",
    "",
    "What the eval proves holds in the product only where the screen sends through aiFetch. Read from each screen's source:",
    "",
    ...wired.map((w) => `- ${w.wired ? "yes" : "**not yet**"}: ${w.what} — \`${w.file}\``),
    "",
    ...(today
      ? [
          `As TutorChat sends today (plain fetch: no ids, nothing scrubbed), the name cases leak a family name to the model on **${today.leaked} of ${today.turns} turns**, and the server can only hold its requests to the address ceiling, not to a learner's or a family's cap. The \`no-name\` and per-learner cap results below describe the product once TutorChat sends through aiFetch.`,
          "",
        ]
      : []),
    "## Known issues",
    "",
    ...Object.entries(KNOWN).map(([id, why]) => {
      const failing = s.byCheck[id as CheckId] ? s.byCheck[id as CheckId]!.total - s.byCheck[id as CheckId]!.pass : 0;
      return `- **${id}** (${failing ? `${failing} failing turn(s)` : "now passes: take it off the known list"}): ${why}`;
    }),
    ...wired.filter((w) => !w.wired).map((w) => `- **wiring**: ${w.what} — not in \`${w.file}\` yet (requested from its owner).`),
    "",
    "## By check",
    "",
    "| Check | Pass |",
    "|---|---|",
    ...Object.entries(s.byCheck).map(([id, v]) => `| ${id} | ${v.pass} / ${v.total} |`),
    "",
    "## Conversations",
    "",
    `| Case | Tags | Turns | First words | ${real ? "Cost" : "Mock tokens as $"} | Result |`,
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
        `- **Learner:** ${t.sent || t.say}`,
        `- **Tutor:** ${t.reply || "(nothing)"}${t.tools.length ? ` _(tools: ${t.tools.map((x) => x.name).join(", ")})_` : ""}${t.flag ? ` _(safety: ${t.flag})_` : ""}${t.budget ? ` _(spend cap: ${t.budget})_` : ""}`,
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
    const mode = real ? `real model (${real.modelId})` : "mock model";
    const results: CaseResult[] = [];
    for (const c of CASES) results.push(await runCase(c, real ?? mockTutor(), { priceAs: real ? undefined : "claude-sonnet-5-5", judge }));
    const s = summarize(results);

    // What the product sends today, where TutorChat does not use aiFetch yet: the name cases again, plainly.
    const wired = wiring();
    let today: Today = null;
    if (!wired[0].wired) {
      const plain: CaseResult[] = [];
      for (const c of CASES.filter((x) => x.extra || x.grownups || x.turns.some((t) => t.say.includes(x.nickname)))) plain.push(await runCase(c, mockTutor(), { plain: true }));
      const turns = plain.flatMap((r) => r.turns);
      today = { turns: turns.length, leaked: turns.filter((t) => t.checks.some((k) => k.id === "no-name" && !k.pass)).length };
    }

    const out = writeReport("tutor", { summary: { mode, ...s, wiring: wired.map((w) => ({ what: w.what, wired: w.wired })), today }, results }, markdown(mode, !!real, results, s, wired, today));
    process.stdout.write(
      `\nTutor eval (${mode}): ${s.turnsPassing}/${s.turns} turns pass (${pct(s.passRate)}); first words median ${ms(s.ttftMedianMs)}${real ? `; ${usd(s.costPerTurnUsd)} per turn` : ""}. ${wired.filter((w) => !w.wired).length} product screen change(s) still to land (see "In the product"). Report: ${out}tutor.md\n`,
    );

    expect(results).toHaveLength(45);
    const failures = results.flatMap((r) => r.turns.flatMap((t, i) => t.checks.filter((k) => !k.pass).map((k) => `${r.id} turn ${i + 1} ${k.id}: ${k.detail}`)));
    if (real) {
      expect(s.passRate, failures.join("\n")).toBeGreaterThanOrEqual(0.9);
      expect(s.ttftMedianMs ?? Infinity, "median time to first words").toBeLessThan(TTFT_BAR_MS);
    } else expect(failures.filter((f) => !Object.keys(KNOWN).some((id) => f.includes(` ${id}: `)))).toEqual([]);
  });
});
