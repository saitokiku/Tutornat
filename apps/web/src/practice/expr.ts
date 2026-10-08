// A small, safe algebra parser for checking typed answers: numbers, single-letter variables,
// + − × ÷ ^, parentheses, implicit multiplication (2x, 3(x+1), (x+1)(x−2)) and sqrt/π.
// No eval. Two expressions are "the same" when they agree at several random points.

import { gcd } from "./rng";

export type Node =
  | { t: "num"; v: number }
  | { t: "var"; n: string }
  | { t: "neg"; a: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { t: "fn"; n: "sqrt"; a: Node };

type Tok = { k: "num"; v: number } | { k: "id"; v: string } | { k: "op"; v: string };

const FUNCS = new Set(["sqrt"]);

function tokenize(src: string): Tok[] | null {
  const s = src
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/\s+/g, "");
  // Runs of three or more letters are words, not products of variables (only sqrt and pi are names).
  if (/[a-z]{3,}/i.test(s.replace(/sqrt|pi/g, ""))) return null;
  const out: Tok[] = [];
  const re = /(\d+\.?\d*|\.\d+)|(sqrt|pi|[a-zA-Z])|([-+*/^()])/gy;
  let m: RegExpExecArray | null;
  while (re.lastIndex < s.length) {
    m = re.exec(s);
    if (!m) return null;
    if (m[1]) out.push({ k: "num", v: Number(m[1]) });
    else if (m[2]) out.push(m[2] === "pi" ? { k: "num", v: Math.PI } : { k: "id", v: m[2] });
    else out.push({ k: "op", v: m[3] });
  }
  return out;
}

export function parse(src: string): Node | null {
  if (src.length > 200) return null;
  const found = tokenize(src);
  if (!found?.length) return null;
  const toks: Tok[] = found;
  let i = 0;
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.k === "op" && peek().v === v;

  // A token that can begin a factor, so "2x" or ")(" means multiply.
  const startsFactor = () => {
    const p = peek();
    return !!p && (p.k === "num" || p.k === "id" || (p.k === "op" && p.v === "("));
  };

  function expr(): Node | null {
    let left = term();
    while (left && (isOp("+") || isOp("-"))) {
      const op = (toks[i++] as { v: "+" | "-" }).v;
      const right = term();
      if (!right) return null;
      left = { t: "bin", op, a: left, b: right };
    }
    return left;
  }
  function term(): Node | null {
    let left = unary();
    while (left) {
      if (isOp("*") || isOp("/")) {
        const op = (toks[i++] as { v: "*" | "/" }).v;
        const right = unary();
        if (!right) return null;
        left = { t: "bin", op, a: left, b: right };
      } else if (startsFactor()) {
        const right = power();
        if (!right) return null;
        left = { t: "bin", op: "*", a: left, b: right };
      } else break;
    }
    return left;
  }
  function unary(): Node | null {
    if (isOp("-")) {
      i++;
      const a = unary();
      return a && { t: "neg", a };
    }
    if (isOp("+")) {
      i++;
      return unary();
    }
    return power();
  }
  function power(): Node | null {
    const base = atom();
    if (base && isOp("^")) {
      i++;
      const exp = unary(); // right-associative; allows x^-2
      return exp && { t: "bin", op: "^", a: base, b: exp };
    }
    return base;
  }
  function atom(): Node | null {
    const p = peek();
    if (!p) return null;
    if (p.k === "num") {
      i++;
      return { t: "num", v: p.v };
    }
    if (p.k === "id") {
      i++;
      if (FUNCS.has(p.v)) {
        const a = power();
        return a && { t: "fn", n: "sqrt", a };
      }
      return { t: "var", n: p.v.toLowerCase() };
    }
    if (p.v === "(") {
      i++;
      const inner = expr();
      if (!inner || !isOp(")")) return null;
      i++;
      return inner;
    }
    return null;
  }

  const tree = expr();
  return tree && i === toks.length ? tree : null;
}

export function evaluate(n: Node, env: Record<string, number>): number {
  switch (n.t) {
    case "num":
      return n.v;
    case "var":
      return env[n.n] ?? NaN;
    case "neg":
      return -evaluate(n.a, env);
    case "fn":
      return Math.sqrt(evaluate(n.a, env));
    case "bin": {
      const a = evaluate(n.a, env), b = evaluate(n.b, env);
      return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : n.op === "/" ? a / b : a ** b;
    }
  }
}

export function variables(n: Node, out = new Set<string>()): Set<string> {
  if (n.t === "var") out.add(n.n);
  else if (n.t === "neg" || n.t === "fn") variables(n.a, out);
  else if (n.t === "bin") {
    variables(n.a, out);
    variables(n.b, out);
  }
  return out;
}

// Fixed sample points (no randomness) so a check gives the same verdict every time.
const SAMPLES = [-2.31, -0.73, 0.57, 1.39, 2.71, 3.83];

/** True when `a` and `b` agree at every sample point (and are defined at most of them). */
export function equivalent(a: Node, b: Node): boolean {
  const vars = [...new Set([...variables(a), ...variables(b)])];
  let defined = 0;
  for (let k = 0; k < SAMPLES.length; k++) {
    const env = Object.fromEntries(vars.map((v, j) => [v, SAMPLES[(k + j * 2) % SAMPLES.length] + j * 0.11]));
    const x = evaluate(a, env), y = evaluate(b, env);
    if (!Number.isFinite(x) && !Number.isFinite(y)) continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (Math.abs(x - y) > 1e-7 * Math.max(1, Math.abs(x), Math.abs(y))) return false;
    defined++;
  }
  return defined >= 3;
}

const hasVar = (n: Node) => variables(n).size > 0;

/** A product of at least two factors that each contain a variable, e.g. (x+2)(x−3), 2(x+1)(x−1), x(x+5) — or a power of a sum, (x+3)^2. */
export function isFactored(n: Node): boolean {
  const factors: Node[] = [];
  const collect = (m: Node) => {
    if (m.t === "bin" && m.op === "*") {
      collect(m.a);
      collect(m.b);
    }
    else if (m.t === "neg") collect(m.a);
    else factors.push(m);
  };
  collect(n);
  const withVar = factors.filter(hasVar);
  if (withVar.length === 1) {
    const f = withVar[0];
    return f.t === "bin" && f.op === "^" && f.a.t === "bin" && (f.a.op === "+" || f.a.op === "-");
  }
  return withVar.length >= 2;
}

/**
 * No parentheses left to multiply out: a sum of terms where no term multiplies a sum. A fraction
 * coefficient in parentheses, as in (3/2)x or −(7/3)x, has nothing to multiply out, and neither has one
 * term over a number, as in (7x)/4, −(7x)/3 or (7x/4).
 */
export function isExpanded(src: string): boolean {
  return !/[()]/.test(
    src
      .replace(/\^\(-?\d+\)/g, "")
      .replace(/\(\s*[-−]?\s*\d+\s*\/\s*\d+\s*\)/g, "")
      .replace(/\(\s*[-−]?\s*\d*\s*\*?\s*[a-z]\s*\)(?=\s*\/\s*\d)/gi, "")
      .replace(/\(\s*[-−]?\s*\d*\s*\*?\s*[a-z]\s*\/\s*\d+\s*\)/gi, ""),
  );
}

/** The top-level terms of a sum: a + b − c → [a, b, c]. */
export function termsOf(n: Node): Node[] {
  if (n.t === "bin" && (n.op === "+" || n.op === "-")) return [...termsOf(n.a), ...termsOf(n.b)];
  if (n.t === "neg") return termsOf(n.a);
  return [n];
}

function varCounts(n: Node, out = new Map<string, number>()): Map<string, number> {
  if (n.t === "var") out.set(n.n, (out.get(n.n) ?? 0) + 1);
  else if (n.t === "neg" || n.t === "fn") varCounts(n.a, out);
  else if (n.t === "bin") {
    varCounts(n.a, out);
    if (n.op !== "^") varCounts(n.b, out);
  }
  return out;
}

/** A term's factors, split into what multiplies and what divides: −3x/4 → [3, x] over [4]. */
function factorsOf(n: Node, top: Node[] = [], bottom: Node[] = []): [Node[], Node[]] {
  if (n.t === "neg") factorsOf(n.a, top, bottom);
  else if (n.t === "bin" && (n.op === "*" || n.op === "/")) {
    factorsOf(n.a, top, bottom);
    if (n.op === "*") factorsOf(n.b, top, bottom);
    else factorsOf(n.b, bottom, top);
  } else top.push(n);
  return [top, bottom];
}

/** A term with arithmetic left to do: number × number (8·2t, 4·1), a number still to work out (2³x), or a fraction to reduce (6x/2). π counts as a name. */
function hasArithmeticLeft(term: Node): boolean {
  const numbers = (list: Node[]) => list.filter((f) => !hasVar(f) && !(f.t === "num" && f.v === Math.PI));
  const [top, bottom] = factorsOf(term).map(numbers);
  if (top.length > 1 || bottom.length > 1 || [...top, ...bottom].some((f) => f.t !== "num")) return true;
  const [a, b] = [top[0], bottom[0]].map((f) => (f?.t === "num" ? f.v : 1));
  return Number.isInteger(a) && Number.isInteger(b) && gcd(a, b) > 1;
}

/**
 * As simple as the expected answer: no more terms, no variable written twice in one term (x·x, x^4·x^3)
 * and no arithmetic left in a term (8·8 + 8·2t is not 64 + 16t worked out).
 */
export function isSimplified(got: Node, want: Node): boolean {
  const terms = termsOf(got);
  if (terms.length > termsOf(want).length) return false;
  return terms.every((t) => [...varCounts(t).values()].every((c) => c <= 1) && !hasArithmeticLeft(t));
}
