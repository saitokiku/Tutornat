/* dom-shim.mjs — the smallest DOM that app.mjs's render path actually uses.
 *
 * NOT a browser and NOT evidence of real-browser behaviour: no layout, no CSS,
 * no focus ring, no screen reader. It exists so render + click handlers can be
 * exercised in `node --test` without launching Chrome. Real-browser claims come
 * from the Playwright files, never from here.
 *
 * Supported selectors: `#id`, `.class`, `tag`, `[attr]`, `[attr="v"]` and a
 * single `tag.class` / `tag[attr]` compound. No descendant combinators: the app
 * only ever queries flat single selectors.
 */

const matchOne = (node, sel) => {
  const m = /^([a-z]+)?(?:#([\w-]+))?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i.exec(sel);
  if (!m) return false;
  const [, tag, id, classes, attrs] = m;
  if (tag && node.tagName !== tag.toUpperCase()) return false;
  if (id && node.getAttribute('id') !== id) return false;
  for (const c of classes ? classes.slice(1).split('.') : []) {
    if (!String(node.className || '').split(/\s+/).includes(c)) return false;
  }
  for (const a of attrs.match(/\[[^\]]+\]/g) || []) {
    const am = /^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(a);
    if (!am) return false;
    const got = node.getAttribute(am[1]);
    if (got == null) return false;
    if (am[2] != null && got !== am[2]) return false;
  }
  return true;
};

class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attrs = new Map();
    this._text = '';
    this.listeners = new Map();
    this.className = '';
    this.open = false;
    this.checked = false;
    this.value = '';
    this.disabled = false;
    this.dataset = {};
  }

  // textContent: a set wipes children (as the real one does); a get concatenates.
  set textContent(v) { this._text = String(v); this.childNodes = []; }
  get textContent() {
    return this.childNodes.length
      ? this.childNodes.map((c) => c.textContent).join('')
      : this._text;
  }

  get children() { return this.childNodes.filter((c) => c instanceof Node); }

  setAttribute(k, v) {
    this.attrs.set(k, String(v));
    if (k === 'id') this.id = String(v);
    if (k === 'class') this.className = String(v);
    if (k === 'disabled') this.disabled = true;
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = String(v);
  }
  getAttribute(k) {
    if (k === 'class') return this.className || (this.attrs.has('class') ? this.attrs.get('class') : null);
    return this.attrs.has(k) ? this.attrs.get(k) : null;
  }
  hasAttribute(k) { return this.getAttribute(k) != null; }
  removeAttribute(k) { this.attrs.delete(k); if (k === 'disabled') this.disabled = false; }

  append(...kids) {
    for (const k of kids) {
      const node = k instanceof Node ? k : Object.assign(new Node('#text'), { _text: String(k) });
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }
  replaceChildren(...kids) { this.childNodes = []; this._text = ''; this.append(...kids); }
  remove() {
    const p = this.parentNode;
    if (p) p.childNodes = p.childNodes.filter((c) => c !== this);
    this.parentNode = null;
  }

  walk() {
    const out = [];
    const visit = (n) => { for (const c of n.children) { out.push(c); visit(c); } };
    visit(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const parts = String(sel).split(',').map((s) => s.trim()).filter(Boolean);
    return this.walk().filter((n) => parts.some((p) => matchOne(n, p)));
  }
  contains(other) { return other === this || this.walk().includes(other); }
  closest(sel) {
    for (let n = this; n; n = n.parentNode) if (matchOne(n, sel)) return n;
    return null;
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatchEvent(ev) {
    for (const fn of this.listeners.get(ev.type) || []) fn.call(this, ev);
    return true;
  }
  /** Returns whatever the handler returned, so a test can await an async click. */
  click() {
    if (this.disabled) return undefined;                 // a disabled control is inert
    const out = (this.listeners.get('click') || []).map((fn) => fn.call(this, { type: 'click', target: this }));
    return out.length === 1 ? out[0] : Promise.all(out);
  }
  focus() { this.ownerDocument.activeElement = this; }
  blur() { if (this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; }
  setSelectionRange() { /* no text layout here */ }
}

export function installDom() {
  const document = {
    activeElement: null,
    createElement(tag) {
      const n = new Node(tag);
      n.ownerDocument = document;
      return n;
    },
  };
  const root = document.createElement('div');
  root.setAttribute('id', 'app');
  globalThis.document = document;
  return { document, root, Node };
}

/** localStorage stand-in. `fail:'set'|'all'` makes it throw like a blocked browser. */
export function fakeStore({ fail = null, quota = false } = {}) {
  const map = new Map();
  const boom = () => {
    const e = new Error(quota ? 'quota exceeded' : 'denied');
    e.name = quota ? 'QuotaExceededError' : 'SecurityError';
    throw e;
  };
  return {
    map,
    getItem: (k) => { if (fail === 'all') boom(); return map.has(k) ? map.get(k) : null; },
    setItem: (k, v) => { if (fail === 'set' || fail === 'all') boom(); map.set(k, String(v)); },
    removeItem: (k) => { if (fail === 'all') boom(); map.delete(k); },
  };
}
