/**
 * A small, safe expression compiler for grading symbolic answers, ported from
 * Kaizen-AI's `web/lib/mathExpr.js`.
 *
 * It parses a whitelisted grammar — numbers, the variable `x`, `+ - * / ^`,
 * parentheses, a fixed set of single-argument functions and three constants —
 * into `(x) => number`. No `eval`, no `Function`, no property access: a
 * learner's answer can compute a value and can never run code. Invalid input
 * compiles to null; a runtime error (the square root of a negative) yields
 * NaN, which the comparison treats as undefined at that point.
 */
const FUNCS: Readonly<Record<string, (value: number) => number>> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
};

/** Names the implicit-multiplication pass must leave alone (`sin(x)` is not `sin*(x)`). */
export const FUNCTION_NAMES: readonly string[] = Object.keys(FUNCS);

const CONSTS: Readonly<Record<string, number>> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

interface Operator {
  prec: number;
  right: boolean;
  apply: (a: number, b: number) => number;
}

const OPS: Readonly<Record<string, Operator>> = {
  '+': { prec: 2, right: false, apply: (a, b) => a + b },
  '-': { prec: 2, right: false, apply: (a, b) => a - b },
  '*': { prec: 3, right: false, apply: (a, b) => a * b },
  '/': { prec: 3, right: false, apply: (a, b) => a / b },
  '^': { prec: 4, right: true, apply: (a, b) => Math.pow(a, b) },
};

const has = (table: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(table, key);

type Token =
  | { type: 'num'; value: number }
  | { type: 'x' }
  | { type: 'neg' }
  | { type: 'func'; name: string }
  | { type: 'op'; name: string; op: Operator }
  | { type: 'open' };

function tokenize(src: string): string[] | null {
  const out: string[] = [];
  const re = /[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*|[-+*/^(),]/g;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    if (match.index !== index) return null; // a gap is an illegal character
    out.push(match[0]);
    index = re.lastIndex;
  }
  return index === src.length ? out : null;
}

/** Unary minus binds looser than ^ but tighter than * and /, so -x^2 is -(x^2). */
const NEG_PREC = 3.5;
const precOf = (token: Token): number =>
  token.type === 'op' ? token.op.prec : token.type === 'neg' ? NEG_PREC : -1;

type Context = 'start' | 'value' | 'op' | 'open' | 'comma' | 'func';

/** Shunting-yard to reverse Polish, with unary minus decided by context. */
function toRpn(tokens: readonly string[]): Token[] | null {
  const output: Token[] = [];
  const ops: Token[] = [];
  let prev: Context = 'start';

  const popWhile = (test: (token: Token) => boolean) => {
    while (ops.length > 0 && test(ops[ops.length - 1]!)) output.push(ops.pop()!);
  };

  for (const tok of tokens) {
    if (/^[0-9.]/.test(tok)) {
      const value = Number(tok);
      if (Number.isNaN(value)) return null;
      output.push({ type: 'num', value });
      prev = 'value';
    } else if (/^[a-zA-Z_]/.test(tok)) {
      if (tok === 'x') {
        output.push({ type: 'x' });
        prev = 'value';
      } else if (has(CONSTS, tok)) {
        output.push({ type: 'num', value: CONSTS[tok]! });
        prev = 'value';
      } else if (has(FUNCS, tok)) {
        ops.push({ type: 'func', name: tok });
        prev = 'func';
      } else {
        return null;
      }
    } else if (tok === ',') {
      popWhile((token) => token.type !== 'open');
      prev = 'comma';
    } else if (tok === '(') {
      ops.push({ type: 'open' });
      prev = 'open';
    } else if (tok === ')') {
      popWhile((token) => token.type !== 'open');
      if (ops.length === 0) return null; // mismatched parenthesis
      ops.pop();
      if (ops.length > 0 && ops[ops.length - 1]!.type === 'func') output.push(ops.pop()!);
      prev = 'value';
    } else if (has(OPS, tok)) {
      const unary = prev === 'start' || prev === 'op' || prev === 'open' || prev === 'comma';
      if (unary) {
        if (tok === '-') ops.push({ type: 'neg' });
        else if (tok !== '+') return null; // * / ^ cannot be unary, which rejects x**2
      } else {
        const op = OPS[tok]!;
        popWhile(
          (top) =>
            top.type !== 'open' &&
            (precOf(top) > op.prec || (precOf(top) === op.prec && !op.right)),
        );
        ops.push({ type: 'op', name: tok, op });
      }
      prev = 'op';
    } else {
      return null;
    }
  }
  while (ops.length > 0) {
    const top = ops.pop()!;
    if (top.type === 'open') return null; // mismatched parenthesis
    output.push(top);
  }
  return output;
}

export type CompiledExpression = (x: number) => number;

/** Compiles a source string to `(x) => number`, or null when it is not in the grammar. */
export function compileExpr(src: string): CompiledExpression | null {
  if (typeof src !== 'string' || !src.trim() || src.length > 240) return null;
  const tokens = tokenize(src.replace(/\s+/g, ''));
  if (!tokens || tokens.length === 0) return null;
  const rpn = toRpn(tokens);
  if (!rpn) return null;

  return (x: number): number => {
    const stack: number[] = [];
    for (const token of rpn) {
      switch (token.type) {
        case 'num':
          stack.push(token.value);
          break;
        case 'x':
          stack.push(x);
          break;
        case 'neg': {
          const value = stack.pop();
          if (value === undefined) return NaN;
          stack.push(-value);
          break;
        }
        case 'func': {
          const value = stack.pop();
          if (value === undefined) return NaN;
          stack.push(FUNCS[token.name]!(value));
          break;
        }
        case 'op': {
          const b = stack.pop();
          const a = stack.pop();
          if (a === undefined || b === undefined) return NaN;
          stack.push(token.op.apply(a, b));
          break;
        }
        default:
          return NaN;
      }
    }
    return stack.length === 1 ? stack[0]! : NaN;
  };
}
