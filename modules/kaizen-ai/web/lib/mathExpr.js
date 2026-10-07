// Tiny, safe math-expression compiler for the graph renderer. Parses a
// whitelisted grammar — numbers, the variable x, + - * / ^, parentheses, and a
// fixed set of single-argument functions/constants — into an evaluator
// (x) => number. NO eval, NO Function, NO property access, so a malicious
// ```graph spec can compute a curve but can never run code. Invalid input
// returns null; runtime errors (e.g. sqrt of a negative) yield NaN, which the
// graph simply skips.

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  exp: Math.exp, ln: Math.log, log: (v) => Math.log10(v), log10: Math.log10, log2: Math.log2,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
};
const CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };
const OPS = {
  '+': { prec: 2, right: false, apply: (a, b) => a + b },
  '-': { prec: 2, right: false, apply: (a, b) => a - b },
  '*': { prec: 3, right: false, apply: (a, b) => a * b },
  '/': { prec: 3, right: false, apply: (a, b) => a / b },
  '^': { prec: 4, right: true, apply: (a, b) => Math.pow(a, b) },
};

function tokenize(src) {
  const out = [];
  const re = /[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*|[-+*/^(),]/g;
  let idx = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index !== idx) return null;   // gap = an illegal character
    out.push(m[0]);
    idx = re.lastIndex;
  }
  return idx === src.length ? out : null;
}

// Unary minus binds looser than ^ but tighter than * / — so -x^2 = -(x^2).
const NEG_PREC = 3.5;
const precOf = (t) => (t.type === 'op' ? t.o.prec : t.type === 'neg' ? NEG_PREC : -1);

// Shunting-yard → RPN, with unary minus detected by context.
function toRPN(tokens) {
  const output = [];
  const ops = [];
  let prevType = 'start';   // start | value | op | open | comma | func

  const popWhile = (test) => { while (ops.length && test(ops[ops.length - 1])) output.push(ops.pop()); };

  for (const tok of tokens) {
    if (/^[0-9.]/.test(tok)) {
      const v = Number(tok);
      if (Number.isNaN(v)) return null;
      output.push({ type: 'num', v });
      prevType = 'value';
    } else if (/^[a-zA-Z_]/.test(tok)) {
      if (tok === 'x') { output.push({ type: 'x' }); prevType = 'value'; }
      else if (Object.prototype.hasOwnProperty.call(CONSTS, tok)) { output.push({ type: 'num', v: CONSTS[tok] }); prevType = 'value'; }
      else if (Object.prototype.hasOwnProperty.call(FUNCS, tok)) { ops.push({ type: 'func', name: tok }); prevType = 'func'; }
      else return null;
    } else if (tok === ',') {
      popWhile((o) => o.type !== 'open');
      prevType = 'comma';
    } else if (tok === '(') {
      ops.push({ type: 'open' });
      prevType = 'open';
    } else if (tok === ')') {
      popWhile((o) => o.type !== 'open');
      if (!ops.length) return null;      // mismatched paren
      ops.pop();                          // discard the '('
      if (ops.length && ops[ops.length - 1].type === 'func') output.push(ops.pop());
      prevType = 'value';
    } else if (tok in OPS) {
      const unaryCtx = prevType === 'start' || prevType === 'op' || prevType === 'open' || prevType === 'comma';
      if (unaryCtx) {
        if (tok === '-') ops.push({ type: 'neg' });   // unary minus
        else if (tok === '+') { /* unary plus — no-op */ }
        else return null;                             // * / ^ cannot be unary (rejects x**2)
      } else {
        const o = OPS[tok];
        popWhile((top) => top.type !== 'open' && (precOf(top) > o.prec || (precOf(top) === o.prec && !o.right)));
        ops.push({ type: 'op', name: tok, o });
      }
      prevType = 'op';
    } else {
      return null;
    }
  }
  while (ops.length) {
    const top = ops.pop();
    if (top.type === 'open') return null; // mismatched paren
    output.push(top);
  }
  return output;
}

// Compile source → (x) => number, or null when the expression is invalid.
export function compileExpr(src) {
  if (typeof src !== 'string' || !src.trim() || src.length > 240) return null;
  const tokens = tokenize(src.replace(/\s+/g, ''));
  if (!tokens || !tokens.length) return null;
  const rpn = toRPN(tokens);
  if (!rpn) return null;

  return (x) => {
    const st = [];
    for (const tok of rpn) {
      if (tok.type === 'num') st.push(tok.v);
      else if (tok.type === 'x') st.push(x);
      else if (tok.type === 'neg') { if (!st.length) return NaN; st.push(-st.pop()); }
      else if (tok.type === 'func') { if (!st.length) return NaN; st.push(FUNCS[tok.name](st.pop())); }
      else if (tok.type === 'op') { if (st.length < 2) return NaN; const b = st.pop(), a = st.pop(); st.push(tok.o.apply(a, b)); }
      else return NaN;
    }
    return st.length === 1 ? st[0] : NaN;
  };
}
