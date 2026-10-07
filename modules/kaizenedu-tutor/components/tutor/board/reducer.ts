/**
 * The whiteboard reducer: one `wb_*` action in, a new board state out.
 *
 * `docs/ARCHITECTURE-MAP.md` §2.2 lists two blockers in upstream's
 * `lib/action/engine.ts` for "draw while talking": every `wb_*` executor
 * `await delay(...)`s its animation, and none honours an `AbortSignal`. Rather
 * than patch a 900-line class that also carries slide, video, and spotlight
 * executors, this module is a pure function over the ten `wb_*` actions the
 * tutor emits, producing the same `PPTElement` shapes the engine produces
 * (compare `engine.ts:485-690`) so the KEEP-verdict canvas
 * (`components/whiteboard/whiteboard-canvas.tsx`, which takes `whiteboard` as
 * a prop) renders them unchanged. Applying an action is synchronous: the
 * element is on the board in the same frame the SSE frame arrived, and there
 * is nothing to cancel on barge-in.
 *
 * Pure and framework-free: no store, no DOM, no clock. `replayBoard` rebuilds
 * a board from the `board` array of `GetSessionResponse` after a reload.
 */
import type {
  LineStyleType,
  PPTElement,
  PPTElementOutline,
  PPTLatexElement,
  PPTLineElement,
  PPTShapeElement,
  PPTTableElement,
  PPTTextElement,
  TableCell,
  Whiteboard,
} from '@openmaic/dsl';
import katex from 'katex';

import type { WhiteboardAction } from '@/lib/tutor/contracts';

/** The logical sheet the canvas lays elements out on (`whiteboard-canvas.tsx:403`). */
export const BOARD_WIDTH = 1000;
export const BOARD_RATIO = 0.5625;
export const BOARD_HEIGHT = BOARD_WIDTH * BOARD_RATIO;

export interface BoardState {
  /** `wb_open` opens the tile; `wb_close` hides it without discarding the work. */
  open: boolean;
  elements: PPTElement[];
  /** Actions applied so far; also the id source for elements that arrive without one. */
  seq: number;
}

export const EMPTY_BOARD: BoardState = { open: false, elements: [], seq: 0 };

const SHAPE_PATHS: Readonly<Record<string, string>> = {
  rectangle: 'M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z',
  circle: 'M 500 0 A 500 500 0 1 1 499 0 Z',
  triangle: 'M 500 0 L 1000 1000 L 0 1000 Z',
};

const DEFAULT_TEXT_COLOR = '#333333';
const DEFAULT_FILL = '#5b9bd5';
const DEFAULT_LINE_COLOR = '#333333';
const DEFAULT_STROKE_COLOR = '#d14424';
const DEFAULT_STROKE_WIDTH = 3;
const DEFAULT_HIGHLIGHT_COLOR = '#ffd166';
const DEFAULT_HIGHLIGHT_OPACITY = 0.35;
/** Canvas pixels of breathing room around a highlighted element. */
const HIGHLIGHT_PAD = 8;
/**
 * A highlight's `name` records its target, so deleting the target takes the
 * highlight with it instead of leaving a yellow box over nothing.
 */
const HIGHLIGHT_NAME_PREFIX = 'highlight:';

/**
 * Math that arrived as text. Only an explicit delimiter counts: `$…$`,
 * `\(…\)`, `\[…\]`. Upstream's `getLikelyLatexMath` (`engine.ts:97`) also
 * guesses from command density; guessing is the wrong trade on a tutor's
 * board, where a wrong guess renders a sentence as a broken formula.
 */
export function delimitedLatex(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed || trimmed.startsWith('<')) return null;
  const pairs: Array<[string, string]> = [
    ['$$', '$$'],
    ['\\[', '\\]'],
    ['\\(', '\\)'],
    ['$', '$'],
  ];
  for (const [open, close] of pairs) {
    if (
      trimmed.length > open.length + close.length &&
      trimmed.startsWith(open) &&
      trimmed.endsWith(close)
    ) {
      const inner = trimmed.slice(open.length, trimmed.length - close.length).trim();
      // A second delimiter inside means prose with inline math, not one formula.
      if (inner && !inner.includes(open === '$$' ? '$$' : open)) return inner;
    }
  }
  return null;
}

/** KaTeX HTML, or null when the formula does not compile. */
export function renderLatexHtml(latex: string): string | null {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' });
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function idFor(action: { elementId?: string }, seq: number): string {
  const given = typeof action.elementId === 'string' ? action.elementId.trim() : '';
  return given || `wb_${seq}`;
}

/** Later writes to the same id replace the element in place, keeping z-order. */
function put(elements: PPTElement[], element: PPTElement): PPTElement[] {
  const at = elements.findIndex((candidate) => candidate.id === element.id);
  if (at === -1) return [...elements, element];
  const next = elements.slice();
  next[at] = element;
  return next;
}

function textElement(
  id: string,
  action: Extract<WhiteboardAction, { type: 'wb_draw_text' }>,
): PPTTextElement {
  const fontSize = action.fontSize ?? 18;
  const raw = action.content ?? '';
  const content = raw.startsWith('<')
    ? raw
    : `<p style="font-size: ${fontSize}px;">${escapeHtml(raw)}</p>`;
  return {
    id,
    type: 'text',
    content,
    left: action.x,
    top: action.y,
    width: action.width ?? 400,
    height: action.height ?? 100,
    rotate: 0,
    defaultFontName: 'Microsoft YaHei',
    defaultColor: action.color ?? DEFAULT_TEXT_COLOR,
  };
}

function latexElement(
  id: string,
  action: { latex: string; x: number; y: number; width?: number; height?: number; color?: string },
): PPTLatexElement | null {
  const html = renderLatexHtml(action.latex);
  if (html === null) return null;
  return {
    id,
    type: 'latex',
    latex: action.latex,
    html,
    left: action.x,
    top: action.y,
    width: action.width ?? 400,
    height: action.height ?? 80,
    rotate: 0,
    color: action.color ?? '#000000',
    fixedRatio: true,
  };
}

function shapeElement(
  id: string,
  action: Extract<WhiteboardAction, { type: 'wb_draw_shape' }>,
): PPTShapeElement {
  return {
    id,
    type: 'shape',
    viewBox: [1000, 1000],
    path: SHAPE_PATHS[action.shape] ?? SHAPE_PATHS.rectangle,
    left: action.x,
    top: action.y,
    width: action.width,
    height: action.height,
    rotate: 0,
    fill: action.fillColor ?? DEFAULT_FILL,
    fixedRatio: false,
  };
}

function lineElement(
  id: string,
  action: Extract<WhiteboardAction, { type: 'wb_draw_line' }>,
): PPTLineElement {
  const left = Math.min(action.startX, action.endX);
  const top = Math.min(action.startY, action.endY);
  return {
    id,
    type: 'line',
    left,
    top,
    width: action.width ?? 2,
    start: [action.startX - left, action.startY - top],
    end: [action.endX - left, action.endY - top],
    style: action.style ?? 'solid',
    color: action.color ?? DEFAULT_LINE_COLOR,
    points: action.points ?? ['', ''],
  };
}

const LINE_STYLES: readonly LineStyleType[] = ['solid', 'dashed', 'dotted'];

/** The action's `style` is a loose `string`; anything unknown falls back to solid. */
function tableOutline(
  outline: { width: number; style: string; color: string } | undefined,
): PPTElementOutline {
  if (!outline) return { width: 2, style: 'solid', color: '#eeece1' };
  const style = (LINE_STYLES as readonly string[]).includes(outline.style)
    ? (outline.style as LineStyleType)
    : 'solid';
  return { width: outline.width, style, color: outline.color };
}

function tableElement(
  id: string,
  action: Extract<WhiteboardAction, { type: 'wb_draw_table' }>,
): PPTTableElement | null {
  const rows = action.data.length;
  const cols = rows > 0 ? (action.data[0]?.length ?? 0) : 0;
  if (rows === 0 || cols === 0) return null;
  let cellId = 0;
  const data: TableCell[][] = action.data.map((row) =>
    row.map((text) => ({ id: `${id}_c${cellId++}`, colspan: 1, rowspan: 1, text })),
  );
  return {
    id,
    type: 'table',
    left: action.x,
    top: action.y,
    width: action.width,
    height: action.height,
    rotate: 0,
    colWidths: Array.from({ length: cols }, () => 1 / cols),
    cellMinHeight: 36,
    data,
    outline: tableOutline(action.outline),
    ...(action.theme
      ? {
          theme: {
            color: action.theme.color,
            rowHeader: true,
            rowFooter: false,
            colHeader: false,
            colFooter: false,
          },
        }
      : {}),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * A stroke is a shape whose path follows the points inside their bounding
 * box, unfilled, with the stroke as its outline. The renderer draws outlines
 * with `vector-effect: non-scaling-stroke`, so the width holds on a phone
 * where the sheet is scaled down.
 */
function strokeElement(
  id: string,
  action: Extract<WhiteboardAction, { type: 'wb_stroke' }>,
): PPTShapeElement | null {
  const points = (Array.isArray(action.points) ? action.points : []).filter(
    (point): point is [number, number] =>
      Array.isArray(point) && point.length === 2 && finite(point[0]) && finite(point[1]),
  );
  if (points.length < 2) return null;
  const width = action.width ?? DEFAULT_STROKE_WIDTH;
  // Half the stroke plus one keeps a flat underline from collapsing to a zero-height box.
  const pad = width / 2 + 1;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = round(Math.min(...xs) - pad);
  const top = round(Math.min(...ys) - pad);
  const boxWidth = round(Math.max(...xs) - Math.min(...xs) + pad * 2);
  const boxHeight = round(Math.max(...ys) - Math.min(...ys) + pad * 2);
  const path = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${round(x - left)} ${round(y - top)}`)
    .join(' ');
  return {
    id,
    type: 'shape',
    viewBox: [boxWidth, boxHeight],
    path,
    left,
    top,
    width: boxWidth,
    height: boxHeight,
    rotate: 0,
    fill: 'none',
    fixedRatio: false,
    outline: { width, style: 'solid', color: action.color ?? DEFAULT_STROKE_COLOR },
  };
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A line's box runs from its origin to the farther of its two ends. */
function elementBox(element: PPTElement): Box {
  if (element.type === 'line') {
    return {
      left: element.left,
      top: element.top,
      width: Math.max(element.start[0], element.end[0], 1),
      height: Math.max(element.start[1], element.end[1], 1),
    };
  }
  return { left: element.left, top: element.top, width: element.width, height: element.height };
}

/** A translucent rectangle over an element on the board, or over a region. */
function highlightElement(
  id: string,
  action: Extract<WhiteboardAction, { type: 'wb_highlight' }>,
  elements: readonly PPTElement[],
): PPTShapeElement | null {
  let box: Box | null = null;
  let name: string | undefined;
  if (typeof action.targetId === 'string' && action.targetId) {
    const target = elements.find((candidate) => candidate.id === action.targetId);
    if (!target) return null;
    const inner = elementBox(target);
    box = {
      left: inner.left - HIGHLIGHT_PAD,
      top: inner.top - HIGHLIGHT_PAD,
      width: inner.width + HIGHLIGHT_PAD * 2,
      height: inner.height + HIGHLIGHT_PAD * 2,
    };
    name = `${HIGHLIGHT_NAME_PREFIX}${target.id}`;
  } else if (
    finite(action.x) &&
    finite(action.y) &&
    finite(action.width) &&
    finite(action.height) &&
    action.width > 0 &&
    action.height > 0
  ) {
    box = { left: action.x, top: action.y, width: action.width, height: action.height };
  }
  if (!box) return null;
  return {
    id,
    type: 'shape',
    viewBox: [1000, 1000],
    path: SHAPE_PATHS.rectangle!,
    ...box,
    rotate: 0,
    fill: action.color ?? DEFAULT_HIGHLIGHT_COLOR,
    fixedRatio: false,
    opacity: action.opacity ?? DEFAULT_HIGHLIGHT_OPACITY,
    ...(name ? { name } : {}),
  };
}

/**
 * Apply one action. Unknown or malformed actions return the state unchanged,
 * so a drift in the turn engine's vocabulary cannot break the board; `seq`
 * still advances so element ids stay unique.
 */
export function applyBoardAction(state: BoardState, action: WhiteboardAction): BoardState {
  const seq = state.seq + 1;
  const next = (patch: Partial<BoardState>): BoardState => ({ ...state, ...patch, seq });
  const drawn = (element: PPTElement | null): BoardState =>
    element === null ? next({}) : next({ open: true, elements: put(state.elements, element) });

  switch (action.type) {
    case 'wb_open':
      return next({ open: true });
    case 'wb_close':
      return next({ open: false });
    case 'wb_clear':
      return next({ elements: [] });
    case 'wb_delete': {
      const id = typeof action.elementId === 'string' ? action.elementId : '';
      if (!id) return next({});
      const pointer = `${HIGHLIGHT_NAME_PREFIX}${id}`;
      return next({
        elements: state.elements.filter((element) => element.id !== id && element.name !== pointer),
      });
    }
    case 'wb_draw_text': {
      const id = idFor(action, seq);
      const content = action.content ?? '';
      if (!content.trim()) return next({});
      const latex = delimitedLatex(content);
      if (latex !== null) {
        return drawn(latexElement(id, { ...action, latex }) ?? textElement(id, action));
      }
      return drawn(textElement(id, action));
    }
    case 'wb_draw_latex':
      return drawn(latexElement(idFor(action, seq), action));
    case 'wb_draw_shape':
      return drawn(shapeElement(idFor(action, seq), action));
    case 'wb_draw_line':
      return drawn(lineElement(idFor(action, seq), action));
    case 'wb_draw_table':
      return drawn(tableElement(idFor(action, seq), action));
    case 'wb_stroke':
      return drawn(strokeElement(idFor(action, seq), action));
    case 'wb_highlight': {
      const given = typeof action.elementId === 'string' ? action.elementId.trim() : '';
      return drawn(highlightElement(given || 'highlight', action, state.elements));
    }
    default:
      return next({});
  }
}

/** Rebuild a board from the actions applied so far (reload replay). */
export function replayBoard(actions: readonly WhiteboardAction[]): BoardState {
  return actions.reduce<BoardState>(applyBoardAction, EMPTY_BOARD);
}

/** The prop `components/whiteboard/whiteboard-canvas.tsx` renders. */
export function toWhiteboard(state: BoardState, id = 'tutor-board'): Whiteboard {
  return {
    id,
    viewportSize: BOARD_WIDTH,
    viewportRatio: BOARD_RATIO,
    elements: state.elements,
  };
}
