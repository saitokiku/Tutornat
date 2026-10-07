// Writes tests/engine/closure-manifest.json: for every imported closure file,
// the pinned source SHA-256 (from harness/source-hashes.txt, produced by
// import-closure.sh against the read-only checkout) and whether the in-tree
// copy is byte-identical. `containmentModified` is the declared list of files
// the containment commit changes; run.cjs case c0_closure_manifest checks that
// nothing else drifted from source.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const lines = fs.readFileSync(path.join(__dirname, 'source-hashes.txt'), 'utf8').trim().split('\n');
const adaptations = {
  'lib/tutor/model/student-model.ts': "import '@/kaizen.config' -> '@/lib/tutor/config'",
  'lib/tutor/model/evidence.ts': "import '@/lib/tutor/auth/session' -> '@/lib/tutor/ids'",
  'lib/tutor/checks/prompt.ts': "import '@/lib/tutor/auth/session' -> '@/lib/tutor/ids'",
  'lib/tutor/session/state.ts': "import '@/kaizen.config' -> '@/lib/tutor/config'",
  'lib/tutor/session/state-machine.ts': "import '@/kaizen.config' -> '@/lib/tutor/config'",
  'lib/tutor/checks/service.ts': 'live-model grader and diagnose placement replaced by abstaining/deterministic adapter seams; imports of cost/sources, prompts/loader, turn/llm-call, llm-grade removed',
  'lib/tutor/session/service.ts': 'subset: rowToSession, loadSession, saveSessionState, rowToTurn, listTurns verbatim; createSession/updateSession/meterMinutes/sitting lookup excluded',
};
// The declared list of files the containment commit changes (tests/engine/containment-modified.json).
const containmentPath = path.join(ROOT, 'tests/engine/containment-modified.json');
const containmentModified = fs.existsSync(containmentPath) ? JSON.parse(fs.readFileSync(containmentPath, 'utf8')) : [];
const files = lines.map((line) => {
  const [p, blob, sha] = line.split(' ');
  const sourceSha256 = sha.replace('sha256=', '');
  const current = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
  const verbatim = !(p in adaptations) && !containmentModified.includes(p);
  return {
    path: p,
    sourceBlob: blob.replace('blob=', ''),
    sourceSha256,
    treeSha256: current,
    verbatim,
    ...(p in adaptations ? { adaptation: adaptations[p] } : {}),
    ...(containmentModified.includes(p) ? { containment: true } : {}),
  };
});
// Files this repository adds beside the copies (no upstream counterpart as a unit).
const added = ['lib/tutor/config.ts', 'lib/tutor/contracts.ts', 'lib/tutor/wire.ts', 'lib/tutor/db/index.ts', 'lib/tutor/ids.ts', 'lib/tutor/accounts/rows.ts'].map((p) => ({
  path: p,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex'),
  derivedFrom: {
    'lib/tutor/config.ts': 'kaizen.config.ts (AgeBand, BANDS.sessionMinutes/thinkingPauseMs, STUDENT_MODEL)',
    'lib/tutor/contracts.ts': 'lib/tutor/contracts.ts (engine subset)',
    'lib/tutor/wire.ts': 'lib/tutor/wire.ts (check/progress/report subset)',
    'lib/tutor/db/index.ts': 'lib/tutor/db/client.ts (Queryable interface only)',
    'lib/tutor/ids.ts': 'lib/tutor/auth/session.ts (newId only)',
    'lib/tutor/accounts/rows.ts': 'lib/tutor/accounts/rows.ts (toIso, toIsoOrNull only)',
  }[p],
}));
const manifest = {
  sourceRepository: 'https://github.com/saitokiku/KaizenEdu',
  sourceCommit: '20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe',
  sourceLicense: 'MIT (legacy/reference-implementations/kaizenedu/LICENSE); see THIRD_PARTY_NOTICES.md',
  generatedBy: 'tests/engine/harness/write-manifest.cjs',
  files,
  added,
  containmentModified,
  excludedFromImport: [
    'git history',
    '.env* and every credential',
    'provider registries and Gemini/LLM routes',
    'lib/tutor/db/client.ts (pg pool)',
    'renderer / OpenMAIC workspace',
    'app/ routes and components',
    'lib/tutor/content/item-bank.json (118 authored items, none reviewed)',
  ],
};
fs.writeFileSync(path.join(ROOT, 'tests/engine/closure-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, verbatim: files.filter((f) => f.verbatim).length, adapted: files.filter((f) => f.adaptation).length, containmentModified: containmentModified.length }));
