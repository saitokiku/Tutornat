// Teaching scenes: the lesson's own visual, animated with intent and handed to the
// learner to work. One module, five kinds, driven entirely by validated core.mjs data.
//
// What makes this teaching rather than decoration:
//   - The reveal is staged in the order the idea is built (parts accumulate, stages
//     arrive, sentences land), so the animation carries the explanation instead of
//     dressing it. Nothing plays until the learner presses Play.
//   - Every reveal is also reachable by hand: the content is fully present and
//     readable at all times, and prefers-reduced-motion lands on the finished state
//     at once. No information is ever gated behind motion.
//   - The scene reports that a turn happened, never whether it was right. Correctness
//     belongs to core.mjs gradeAnswer and nowhere near a rendering module.
//   - checkMode starts neutral: no keyed value is seeded and no answer key is ever
//     accepted, so the fresh check cannot leak its own answer through the picture.

const STEP_MS = 900;        // one reveal beat
const TOKEN_MS = 180;       // counters arrive quickly; a long count would drag

const COPY = {
  en: {
    play: 'Play', pause: 'Pause', replay: 'Replay',
    fraction: { young: 'Tap the parts to colour them in. Arrow keys work too.',
      older: 'Shade parts up to the amount you want, by tap or arrow key.' },
    numberline: { young: 'Slide the dot along the line. Arrow keys work too.',
      older: 'Move the marker to the value you want, by drag or arrow key.' },
    tokens: { young: 'Tap each one as you count it.', older: 'Count them off one at a time; the number shows as you go.' },
    passage: { young: 'Tap the sentence you want.', older: 'Select the sentence that answers the question.' },
    sequence: { young: 'Press Play to watch it, or tap a step yourself.', older: 'Play the stages in order, or step through them yourself.' },
    sFraction: '{filled} of {parts} parts shaded',
    sNumberline: 'Value {value}, between {min} and {max}',
    sTokens: '{counted} of {count} counted',
    sPassage: 'Sentence {n} of {total} selected', sPassageNone: 'No sentence selected',
    sSequence: 'Stage {n} of {total}: {label}',
    partLabel: 'Part {n} of {parts}', tokenLabel: 'Counter {n}', sentenceLabel: 'Sentence {n}',
  },
  es: {
    play: 'Reproducir', pause: 'Pausa', replay: 'Repetir',
    fraction: { young: 'Toque las partes para colorearlas. También funcionan las flechas.',
      older: 'Sombree las partes hasta la cantidad que quiera, con toque o flechas.' },
    numberline: { young: 'Deslice el punto por la línea. También funcionan las flechas.',
      older: 'Mueva el marcador al valor que quiera, arrastrando o con flechas.' },
    tokens: { young: 'Toque cada uno mientras lo cuenta.', older: 'Cuéntelos uno por uno; el número aparece mientras avanza.' },
    passage: { young: 'Toque la oración que quiera.', older: 'Seleccione la oración que responde a la pregunta.' },
    sequence: { young: 'Presione Reproducir para verlo, o toque un paso usted mismo.', older: 'Reproduzca las etapas en orden, o avance usted mismo.' },
    sFraction: '{filled} de {parts} partes sombreadas',
    sNumberline: 'Valor {value}, entre {min} y {max}',
    sTokens: '{counted} de {count} contados',
    sPassage: 'Oración {n} de {total} seleccionada', sPassageNone: 'Ninguna oración seleccionada',
    sSequence: 'Etapa {n} de {total}: {label}',
    partLabel: 'Parte {n} de {parts}', tokenLabel: 'Contador {n}', sentenceLabel: 'Oración {n}',
  },
};

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k in n && k !== 'list') n[k] = v;
    else n.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid) n.append(kid);
  return n;
}

// Same split app.mjs uses for passages, kept local so this module stands alone.
const sentences = (text) => String(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

/**
 * @param {object} o
 * @param {object} o.visual     a validated core.mjs visual (fraction|numberline|tokens|passage|sequence)
 * @param {'en'|'es'} o.locale
 * @param {number} [o.age]      self-reported, scales instruction wording only
 * @param {(type: string, detail?: object) => void} [o.onTurn]  real learner interaction, never a verdict
 * @param {(type: string) => void} [o.onEvent]                  typed slug only
 * @param {boolean} [o.checkMode]  fresh check: start neutral, never show a keyed value
 * @returns {{element: HTMLElement, destroy: () => void}}
 */
export function createTeachingScene(o = {}) {
  const v = o.visual || {};
  const locale = o.locale === 'es' ? 'es' : 'en';
  const t = COPY[locale];
  const check = o.checkMode === true;
  // Self-reported age picks wording only. It asserts nothing about what the learner
  // can do and nothing here is validated against a curriculum.
  const band = Number.isFinite(o.age) && o.age <= 7 ? 'young' : 'older';

  let dead = false;
  let timer = 0;
  let playing = false;
  const emit = (type) => { if (!dead && typeof o.onEvent === 'function') o.onEvent(type); };
  const turn = (type, detail) => { if (!dead && typeof o.onTurn === 'function') o.onTurn(type, detail); };

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const still = () => reduced?.matches === true;

  // Learner-facing state. In checkMode nothing is seeded from the visual: the keyed
  // value would be the answer.
  const state = {
    fraction: () => ({ filled: check ? 0 : clamp(v.filled ?? 0, 0, v.parts) }),
    numberline: () => ({ value: check ? v.min : clamp(v.value ?? v.min, v.min, v.max) }),
    tokens: () => ({ counted: [] }),
    passage: () => ({ selected: null }),
    sequence: () => ({ stage: 0 }),
  }[v.kind]?.() ?? {};

  const total = v.kind === 'sequence' ? (v.stages?.length ?? 0)
    : v.kind === 'tokens' ? v.count
      : v.kind === 'fraction' ? v.parts
        : v.kind === 'passage' ? sentences(v.text).length : 1;

  const element = el('section', {
    class: 'lw-scene', 'data-kind': v.kind || 'unknown',
    'data-playing': 'false', 'data-revealed': '0', 'aria-label': v.caption || '',
  });
  const how = el('p', { class: 'lw-scene-how', text: (t[v.kind] || {})[band] || '' });
  const live = el('p', { class: 'lw-scene-state', id: 'lw-scene-state', role: 'status', 'aria-live': 'polite' });
  const caption = el('p', { class: 'lw-scene-cap', text: v.caption || '' });

  const describe = () => {
    switch (v.kind) {
      case 'fraction': return fill(t.sFraction, { filled: state.filled, parts: v.parts });
      case 'numberline': return fill(t.sNumberline, { value: state.value, min: v.min, max: v.max });
      case 'tokens': return fill(t.sTokens, { counted: state.counted.length, count: v.count });
      case 'sequence': return fill(t.sSequence, { n: state.stage + 1, total, label: v.stages[state.stage]?.label ?? '' });
      case 'passage': return state.selected === null ? t.sPassageNone
        : fill(t.sPassage, { n: state.selected + 1, total });
      default: return v.caption || '';
    }
  };

  // ---------------------------------------------------------------- bodies
  const body = el('div', { class: 'lw-scene-body' });
  let paint = () => {};
  let revealed = 0;      // how far the staged reveal has advanced

  if (v.kind === 'fraction') {
    const bar = el('div', { class: 'lw-scene-bar', role: 'group', 'aria-label': v.caption });
    const parts = [];
    for (let i = 0; i < v.parts; i++) {
      const b = el('button', {
        type: 'button', class: 'lw-scene-part', 'data-i': i, 'aria-pressed': 'false',
        'aria-label': fill(t.partLabel, { n: i + 1, parts: v.parts }), 'aria-describedby': 'lw-scene-state',
      });
      // Shade UP TO the tapped part: the learner expresses a quantity, not a toggle.
      b.addEventListener('click', () => {
        state.filled = state.filled === i + 1 ? i : i + 1;
        paint(); turn('fraction-fill', { filled: state.filled, parts: v.parts });
      });
      parts.push(b); bar.append(b);
    }
    paint = () => {
      parts.forEach((b, i) => {
        const on = i < state.filled;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.toggleAttribute('data-revealing', on && i === state.filled - 1 && playing);
      });
      live.textContent = describe();
    };
    body.append(bar);
  } else if (v.kind === 'numberline') {
    // Guard the step against a degenerate or enormous span: a zero or non-finite
    // step makes the slider unusable, and core.mjs only guarantees max > min.
    const span = v.max - v.min;
    const step = Number.isFinite(span) && span > 0
      ? (span <= 20 && Number.isInteger(span) ? 1 : span / 100) : 1;
    const range = el('input', {
      type: 'range', id: 'lw-scene-range', class: 'lw-scene-range',
      min: v.min, max: v.max, step, 'aria-label': v.caption, 'aria-describedby': 'lw-scene-state',
    });
    range.value = String(state.value);
    range.addEventListener('input', () => {
      const n = Number(range.value);
      state.value = Number.isFinite(n) ? n : v.min;
      live.textContent = describe();
      turn('numberline-move', { value: state.value, min: v.min, max: v.max });
    });
    const ticks = el('div', { class: 'lw-scene-ticks', 'aria-hidden': 'true' });
    for (let i = 0; i <= 4; i++) {
      const at = v.min + (span * i) / 4;
      ticks.append(el('span', { text: Number.isFinite(at) ? String(Math.round(at * 100) / 100) : '' }));
    }
    paint = () => { range.value = String(state.value); live.textContent = describe(); };
    body.append(range, ticks);
  } else if (v.kind === 'tokens') {
    const grid = el('div', { class: 'lw-scene-tokens', role: 'group', 'aria-label': v.caption });
    const cells = [];
    for (let i = 0; i < v.count; i++) {
      const b = el('button', {
        type: 'button', class: 'lw-scene-token', 'data-i': i, 'aria-pressed': 'false',
        'aria-label': fill(t.tokenLabel, { n: i + 1 }), 'aria-describedby': 'lw-scene-state',
      });
      b.addEventListener('click', () => {
        const at = state.counted.indexOf(i);
        if (at === -1) state.counted.push(i); else state.counted.splice(at, 1);
        paint(); turn('token-count', { counted: state.counted.length, count: v.count });
      });
      cells.push(b); grid.append(b);
    }
    paint = () => {
      cells.forEach((b, i) => {
        const at = state.counted.indexOf(i);
        b.setAttribute('aria-pressed', at === -1 ? 'false' : 'true');
        b.textContent = at === -1 ? '' : String(at + 1);
        b.toggleAttribute('data-revealing', at === state.counted.length - 1 && playing);
      });
      live.textContent = describe();
    };
    body.append(grid);
  } else if (v.kind === 'passage') {
    // The authored passage is rendered verbatim, never translated or rewritten.
    const wrap = el('div', { class: 'lw-scene-passage', role: 'group', 'aria-label': v.caption, lang: locale === 'es' ? 'en' : null });
    const rows = sentences(v.text).map((s, i) => {
      const b = el('button', {
        type: 'button', class: 'lw-scene-sentence', 'data-i': i, text: s,
        'aria-pressed': 'false', 'aria-label': `${fill(t.sentenceLabel, { n: i + 1 })}: ${s}`,
      });
      b.addEventListener('click', () => {
        state.selected = state.selected === i ? null : i;
        paint(); turn('sentence-select', { selected: state.selected, total });
      });
      wrap.append(b); return b;
    });
    paint = () => {
      rows.forEach((b, i) => {
        b.setAttribute('aria-pressed', state.selected === i ? 'true' : 'false');
        b.toggleAttribute('data-revealing', playing && i === revealed - 1);
      });
      live.textContent = describe();
    };
    body.append(wrap);
  } else if (v.kind === 'sequence') {
    const list = el('ol', { class: 'lw-scene-seq', 'aria-label': v.caption });
    const rows = (v.stages || []).map((s, i) => {
      const row = el('li', { class: 'lw-scene-stage', 'data-i': i, 'data-current': 'false' }, [
        el('p', { class: 'lw-scene-n', 'aria-hidden': 'true', text: String(i + 1) }),
        el('div', {}, [
          el('p', { class: 'lw-scene-label', text: s.label }),
          el('p', { class: 'lw-scene-detail', text: s.detail }),
        ]),
      ]);
      // Every stage is readable from the start; clicking moves the learner's focus,
      // it does not unhide anything.
      row.addEventListener('click', () => {
        state.stage = i; paint(); turn('stage-step', { stage: i, total });
      });
      list.append(row); return row;
    });
    paint = () => {
      rows.forEach((row, i) => {
        row.setAttribute('data-current', i === state.stage ? 'true' : 'false');
        row.toggleAttribute('data-revealing', playing && i === revealed - 1);
      });
      live.textContent = describe();
    };
    body.append(list);
  } else {
    body.append(el('p', { class: 'lw-scene-detail', text: v.caption || '' }));
  }

  // ---------------------------------------------------------------- reveal
  // The staged reveal walks the SAME learner state the controls write, so Play is a
  // demonstration of the manipulation rather than a separate animation track.
  function applyReveal(n) {
    revealed = clamp(n, 0, total);
    element.setAttribute('data-revealed', String(revealed));
    switch (v.kind) {
      case 'fraction': state.filled = revealed; break;
      case 'tokens': state.counted = Array.from({ length: revealed }, (_, i) => i); break;
      case 'sequence': state.stage = clamp(revealed - 1, 0, total - 1); break;
      case 'passage': state.selected = null; break;
      case 'numberline': {
        const span = v.max - v.min;
        state.value = Math.round((v.min + (span * revealed) / total) * 1e6) / 1e6;
        break;
      }
      default: break;
    }
    paint();
  }

  function stop(typed) {
    if (timer) { clearTimeout(timer); timer = 0; }
    if (!playing) return;
    playing = false;
    element.setAttribute('data-playing', 'false');
    paint();
    if (typed) emit(typed);
  }

  function tick() {
    if (dead || !playing) return;
    if (revealed >= total) { stop('reveal-end'); return; }
    applyReveal(revealed + 1);
    timer = setTimeout(tick, v.kind === 'tokens' ? TOKEN_MS : STEP_MS);
  }

  function play() {
    if (dead) return;
    if (playing) { stop('reveal-pause'); return; }
    if (revealed >= total) applyReveal(0);
    // Reduced motion: the learner gets the finished state immediately. The reveal is
    // a teaching aid, not a gate, so skipping it loses nothing.
    if (still()) { applyReveal(total); emit('reveal-instant'); return; }
    playing = true;
    element.setAttribute('data-playing', 'true');
    emit('reveal-play');
    tick();
  }

  function replay() {
    stop(null);
    applyReveal(0);
    emit('reveal-replay');
    play();
  }

  const playBtn = el('button', { type: 'button', id: 'lw-scene-play', class: 'lw-btn', text: t.play });
  const replayBtn = el('button', { type: 'button', id: 'lw-scene-replay', class: 'lw-btn lw-quiet', text: t.replay });
  playBtn.addEventListener('click', () => { play(); playBtn.textContent = playing ? t.pause : t.play; });
  replayBtn.addEventListener('click', () => { replay(); playBtn.textContent = playing ? t.pause : t.play; });

  element.append(how, body, el('div', { class: 'lw-scene-controls' }, [playBtn, replayBtn]), live, caption);
  paint();

  return {
    element,
    destroy() {
      if (dead) return;
      dead = true;
      if (timer) { clearTimeout(timer); timer = 0; }
      playing = false;
      element.remove();
    },
  };
}
