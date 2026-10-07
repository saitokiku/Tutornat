// Round-6/7 probe: which evaluator path fires for each presentation of the reviewer's three expressions,
// plus the reviewer's r6 semantic cases (must all abstain). Prints one line per stem: stem, value or null,
// path, reason. Offline, no database.
const { load } = require('./loader.cjs');
const cc = load('@/lib/tutor/assessment/content-check');
const forms = [x => 'Compute ' + x + '.', x => 'Compute (' + x + ').', x => 'What is the value of ' + x + '?', x => 'Evaluate: ' + x + '.', x => '$' + x + '$', x => 'Compute ' + x + ' = ?', x => x + '\nGive your answer as a fraction.', x => 'Calculate ' + x + '.'];
const exprs = ['1/2 + 1/3', '2 + 2', '2 × 3/5'];
const extra = [
  'Maya ate 3/4 of a pizza and Sam ate 1/8. What fraction did they eat together?', 'Explain what the denominator tells you.', 'Compute 2 plus 2.', 'What is 1 1/2 + 2 1/4?', 'Compute \\frac{1}{2} + \\frac{1}{3}.', 'Compute 2 + 2.', 'Compute 1/0.', 'Compute 2 + 2 + 2.', 'Sam had 5/6 of a pie and ate 1/3. How much is left?',
  // reviewer r6 semantic probes — every one must abstain
  'Compute 2 + 2.\nThen double the result.', 'Compute 2 + 2. Then double the result.', 'Compute 2² + 3.', 'Maya has 2 bags with 3 marbles in each. How many marbles in total?', 'Maya has 3 marbles. Sam has 5 marbles. How many more does Sam have?', 'Compute 1/0 + 2.',
  'Compute ½ + 1.', 'Compute (2 + 2.', 'Compute ((2 + 2)).', 'Compute 99999999999999999999 * 99999999999999999999.',
];
const out = [];
for (const e of exprs) for (const f of forms) out.push(f(e));
let evaluated = 0; let abstained = 0;
for (const s of [...out, ...extra]) { const r = cc.evaluateStem(s); if (r.value) evaluated++; else abstained++; console.log(JSON.stringify(s), r.value ? cc.showRational(r.value) : null, r.path, r.why || ''); }
console.log(JSON.stringify({ stems: out.length + extra.length, evaluated, abstained }));
