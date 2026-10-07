// Prints a compact per-case summary of a results-*.json file (header, then one
// line per case with pass/skip and the observed object truncated), so the PR
// Evidence section and a reviewer's diff quote the same numbers.
//   node tests/engine/harness/summarize-results.cjs tests/engine/evidence/results-assessment.json [maxChars]
const fs = require('node:fs');
const [file, max = '1600'] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('header ' + JSON.stringify(r.header));
for (const rec of r.records) {
  const tag = rec.pass ? 'PASS' : 'FAIL';
  console.log(`== ${rec.case} [${rec.db ?? rec.mode}] ${tag}${rec.skipped ? ' skipped: ' + rec.skipped : ''}`);
  if (rec.error) console.log('   error: ' + JSON.stringify(rec.error));
  if (rec.observed) console.log('   ' + JSON.stringify(rec.observed).slice(0, Number(max)));
}
console.log(`summary cases=${r.records.length} failed=${r.records.filter((x) => !x.pass).length}`);
