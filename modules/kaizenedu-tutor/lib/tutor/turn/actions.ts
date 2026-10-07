/**
 * Validates a `[[wb ...]]` payload against the whiteboard half of the Action
 * DSL (`packages/@openmaic/dsl/src/action.ts`, re-exported by
 * `@/lib/types/action`) before it reaches the board.
 *
 * The model is asked for one JSON object per drawing on a 1000 × 562.5 sheet
 * with a top-left origin. What arrives is untrusted: a missing field, a string
 * where a number belongs, an unknown type, or an origin off the sheet is
 * dropped and counted (`SessionState.droppedActions`) rather than rendered.
 * A drawing whose origin is on the sheet but whose width or height runs past
 * the edge is clamped to the edge instead of dropped — the teaching survives.
 *
 * Every action gets an `id` (the DSL requires one) and every drawable an
 * `elementId`, so a later `wb_delete` or reference has something to name.
 * Pure: no I/O.
 */
import type { WhiteboardAction } from '@/lib/tutor/contracts';
import type {
  WbDrawLatexAction,
  WbDrawLineAction,
  WbDrawShapeAction,
  WbDrawTableAction,
  WbDrawTextAction,
  WbHighlightAction,
  WbStrokeAction,
} from '@/lib/types/action';

/** The sheet the prompt describes (whiteboard.md); coordinates are absolute. */
export const SHEET_WIDTH = 1000;
export const SHEET_HEIGHT = 562.5;

/** The whiteboard verbs the tutor may use. `wb_close`, charts, and code are not offered. */
export const WB_ACTION_TYPES = [
  'wb_open',
  'wb_draw_text',
  'wb_draw_latex',
  'wb_draw_shape',
  'wb_draw_line',
  'wb_draw_table',
  'wb_stroke',
  'wb_highlight',
  'wb_clear',
  'wb_delete',
] as const;
export type WbActionType = (typeof WB_ACTION_TYPES)[number];

/** The most points one stroke may carry: enough for a ring drawn by hand. */
export const STROKE_MAX_POINTS = 200;
/** The id a highlight gets when the model gives none, so the next one replaces it. */
export const HIGHLIGHT_ELEMENT_ID = 'highlight';

const SHAPES = ['rectangle', 'circle', 'triangle'] as const;
const LINE_STYLES = ['solid', 'dashed'] as const;
const MARKERS = ['', 'arrow'] as const;

export type ActionValidation =
  | { ok: true; action: WhiteboardAction }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

const COLOR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\([\d\s.,%]{5,40}\))$/;

function color(value: unknown): string | undefined {
  const text = str(value);
  return text && COLOR.test(text) ? text : undefined;
}

function onSheet(x: number, y: number): boolean {
  return x >= 0 && x <= SHEET_WIDTH && y >= 0 && y <= SHEET_HEIGHT;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A positive size clamped so `origin + size` stays on the sheet. */
function fit(size: number | null, origin: number, limit: number, fallback: number): number | null {
  const raw = size ?? fallback;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const room = limit - origin;
  if (room <= 0) return null;
  return Math.min(raw, room);
}

export interface ActionIdFactory {
  /** Unique per turn; the DSL's `ActionBase.id`. */
  actionId(): string;
  /** Only used when the model omitted `elementId`. */
  elementId(type: WbActionType): string;
}

/** Deterministic ids: `<prefix>-<turn>-<n>`; stable for tests and for replay. */
export function createIdFactory(seed: string): ActionIdFactory {
  let actions = 0;
  let elements = 0;
  return {
    actionId: () => `act_${seed}_${(actions += 1)}`,
    elementId: (type) => `${type.replace(/^wb_(draw_)?/, '')}_${seed}_${(elements += 1)}`,
  };
}

interface Common {
  id: string;
  elementId: string;
}

function common(
  payload: Record<string, unknown>,
  ids: ActionIdFactory,
  type: WbActionType,
): Common {
  return {
    id: str(payload.id) ?? ids.actionId(),
    elementId: str(payload.elementId) ?? ids.elementId(type),
  };
}

function text(payload: Record<string, unknown>, ids: ActionIdFactory): ActionValidation {
  const content = str(payload.content) ?? str(payload.text);
  if (!content) return { ok: false, reason: 'wb_draw_text needs content' };
  const x = num(payload.x);
  const y = num(payload.y);
  if (x === null || y === null) return { ok: false, reason: 'wb_draw_text needs x and y' };
  if (!onSheet(x, y)) return { ok: false, reason: 'wb_draw_text origin is off the sheet' };
  const width = fit(num(payload.width), x, SHEET_WIDTH, 400);
  const height = fit(num(payload.height), y, SHEET_HEIGHT, 100);
  if (width === null || height === null)
    return { ok: false, reason: 'wb_draw_text has no room on the sheet' };
  const fontSize = num(payload.fontSize);
  const action: WbDrawTextAction = {
    ...common(payload, ids, 'wb_draw_text'),
    type: 'wb_draw_text',
    // Speech is spoken; the board shows plain words, so markup is stripped here.
    content: content.replace(/[*_`#]/g, ''),
    x,
    y,
    width,
    height,
    ...(fontSize === null ? {} : { fontSize: clamp(fontSize, 10, 72) }),
    ...(color(payload.color) ? { color: color(payload.color) } : {}),
  };
  return { ok: true, action };
}

function latex(payload: Record<string, unknown>, ids: ActionIdFactory): ActionValidation {
  const formula = str(payload.latex);
  if (!formula) return { ok: false, reason: 'wb_draw_latex needs latex' };
  const x = num(payload.x);
  const y = num(payload.y);
  if (x === null || y === null) return { ok: false, reason: 'wb_draw_latex needs x and y' };
  if (!onSheet(x, y)) return { ok: false, reason: 'wb_draw_latex origin is off the sheet' };
  const width = fit(num(payload.width), x, SHEET_WIDTH, 240);
  const height = fit(num(payload.height), y, SHEET_HEIGHT, 60);
  if (width === null || height === null)
    return { ok: false, reason: 'wb_draw_latex has no room on the sheet' };
  const action: WbDrawLatexAction = {
    ...common(payload, ids, 'wb_draw_latex'),
    type: 'wb_draw_latex',
    latex: formula,
    x,
    y,
    width,
    height,
    ...(color(payload.color) ? { color: color(payload.color) } : {}),
  };
  return { ok: true, action };
}

function shape(payload: Record<string, unknown>, ids: ActionIdFactory): ActionValidation {
  const kind = str(payload.shape);
  if (!kind || !(SHAPES as readonly string[]).includes(kind))
    return { ok: false, reason: 'wb_draw_shape needs rectangle, circle, or triangle' };
  const x = num(payload.x);
  const y = num(payload.y);
  if (x === null || y === null) return { ok: false, reason: 'wb_draw_shape needs x and y' };
  if (!onSheet(x, y)) return { ok: false, reason: 'wb_draw_shape origin is off the sheet' };
  const width = fit(num(payload.width), x, SHEET_WIDTH, 0);
  const height = fit(num(payload.height), y, SHEET_HEIGHT, 0);
  if (width === null || height === null)
    return { ok: false, reason: 'wb_draw_shape needs a positive width and height on the sheet' };
  const action: WbDrawShapeAction = {
    ...common(payload, ids, 'wb_draw_shape'),
    type: 'wb_draw_shape',
    shape: kind as WbDrawShapeAction['shape'],
    x,
    y,
    width,
    height,
    ...(color(payload.fillColor) ? { fillColor: color(payload.fillColor) } : {}),
  };
  return { ok: true, action };
}

function markers(value: unknown): WbDrawLineAction['points'] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const [start, end] = value;
  if (typeof start !== 'string' || typeof end !== 'string') return undefined;
  if (!(MARKERS as readonly string[]).includes(start)) return undefined;
  if (!(MARKERS as readonly string[]).includes(end)) return undefined;
  return [start, end] as WbDrawLineAction['points'];
}

function line(payload: Record<string, unknown>, ids: ActionIdFactory): ActionValidation {
  const startX = num(payload.startX);
  const startY = num(payload.startY);
  const endX = num(payload.endX);
  const endY = num(payload.endY);
  if (startX === null || startY === null || endX === null || endY === null)
    return { ok: false, reason: 'wb_draw_line needs startX, startY, endX, endY' };
  if (!onSheet(startX, startY) || !onSheet(endX, endY))
    return { ok: false, reason: 'wb_draw_line runs off the sheet' };
  if (startX === endX && startY === endY)
    return { ok: false, reason: 'wb_draw_line has zero length' };
  const width = num(payload.width);
  const style = str(payload.style);
  const points = markers(payload.points);
  const action: WbDrawLineAction = {
    ...common(payload, ids, 'wb_draw_line'),
    type: 'wb_draw_line',
    startX,
    startY,
    endX,
    endY,
    ...(width === null ? {} : { width: clamp(width, 1, 12) }),
    ...(style && (LINE_STYLES as readonly string[]).includes(style)
      ? { style: style as WbDrawLineAction['style'] }
      : {}),
    ...(points ? { points } : {}),
    ...(color(payload.color) ? { color: color(payload.color) } : {}),
  };
  return { ok: true, action };
}

function point(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length === 2) {
    const x = num(value[0]);
    const y = num(value[1]);
    return x === null || y === null ? null : [x, y];
  }
  if (isRecord(value)) {
    const x = num(value.x);
    const y = num(value.y);
    return x === null || y === null ? null : [x, y];
  }
  return null;
}

function stroke(payload: Record<string, unknown>, ids: ActionIdFactory): ActionValidation {
  if (!Array.isArray(payload.points)) return { ok: false, reason: 'wb_stroke needs points' };
  const points: [number, number][] = [];
  for (const raw of payload.points.slice(0, STROKE_MAX_POINTS)) {
    const parsed = point(raw);
    if (parsed === null) return { ok: false, reason: 'wb_stroke has a point that is not [x, y]' };
    // A point past the edge is pulled back to it: the ring still closes around the thing.
    points.push([clamp(parsed[0], 0, SHEET_WIDTH), clamp(parsed[1], 0, SHEET_HEIGHT)]);
  }
  if (points.length < 2) return { ok: false, reason: 'wb_stroke needs at least two points' };
  const [first] = points;
  if (points.every(([x, y]) => x === first![0] && y === first![1]))
    return { ok: false, reason: 'wb_stroke has zero length' };
  const width = num(payload.width);
  const action: WbStrokeAction = {
    ...common(payload, ids, 'wb_stroke'),
    type: 'wb_stroke',
    points,
    ...(width === null ? {} : { width: clamp(width, 1, 12) }),
    ...(color(payload.color) ? { color: color(payload.color) } : {}),
  };
  return { ok: true, action };
}

/**
 * A highlight points at one element (`targetId`) or one region. It carries its
 * own `elementId` so `wb_delete` can remove it; the default id means the next
 * highlight replaces the last, which is how pointing works.
 */
function highlight(
  payload: Record<string, unknown>,
  ids: ActionIdFactory,
  known: ReadonlySet<string>,
): ActionValidation {
  const elementId = str(payload.elementId) ?? HIGHLIGHT_ELEMENT_ID;
  const opacity = num(payload.opacity);
  const base = {
    id: str(payload.id) ?? ids.actionId(),
    elementId,
    ...(color(payload.color) ? { color: color(payload.color) } : {}),
    ...(opacity === null ? {} : { opacity: clamp(opacity, 0.1, 0.8) }),
  };
  const targetId = str(payload.targetId);
  if (targetId) {
    if (targetId === elementId) return { ok: false, reason: 'wb_highlight cannot target itself' };
    if (known.size > 0 && !known.has(targetId))
      return { ok: false, reason: 'wb_highlight names an element that is not on the board' };
    const action: WbHighlightAction = { ...base, type: 'wb_highlight', targetId };
    return { ok: true, action };
  }
  const x = num(payload.x);
  const y = num(payload.y);
  if (x === null || y === null)
    return { ok: false, reason: 'wb_highlight needs a targetId or a region' };
  if (!onSheet(x, y)) return { ok: false, reason: 'wb_highlight region is off the sheet' };
  const width = fit(num(payload.width), x, SHEET_WIDTH, 0);
  const height = fit(num(payload.height), y, SHEET_HEIGHT, 0);
  if (width === null || height === null)
    return { ok: false, reason: 'wb_highlight needs a positive width and height on the sheet' };
  const action: WbHighlightAction = { ...base, type: 'wb_highlight', x, y, width, height };
  return { ok: true, action };
}

function tableData(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rows: string[][] = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length === 0) return null;
    const cells: string[] = [];
    for (const cell of row) {
      if (typeof cell === 'string') cells.push(cell);
      else if (typeof cell === 'number' && Number.isFinite(cell)) cells.push(String(cell));
      else return null;
    }
    rows.push(cells);
  }
  const columns = rows[0]!.length;
  return rows.every((row) => row.length === columns) ? rows : null;
}

function table(payload: Record<string, unknown>, ids: ActionIdFactory): ActionValidation {
  const data = tableData(payload.data);
  if (!data) return { ok: false, reason: 'wb_draw_table needs rectangular string rows' };
  const x = num(payload.x);
  const y = num(payload.y);
  if (x === null || y === null) return { ok: false, reason: 'wb_draw_table needs x and y' };
  if (!onSheet(x, y)) return { ok: false, reason: 'wb_draw_table origin is off the sheet' };
  const width = fit(num(payload.width), x, SHEET_WIDTH, 120 * data[0]!.length);
  const height = fit(num(payload.height), y, SHEET_HEIGHT, 40 * data.length);
  if (width === null || height === null)
    return { ok: false, reason: 'wb_draw_table has no room on the sheet' };
  const action: WbDrawTableAction = {
    ...common(payload, ids, 'wb_draw_table'),
    type: 'wb_draw_table',
    x,
    y,
    width,
    height,
    data,
  };
  return { ok: true, action };
}

/**
 * One `[[wb ...]]` payload → a whiteboard action, or the reason it was dropped.
 * `known` is the set of element ids already on the board, so `wb_delete` cannot
 * name something that was never drawn.
 */
export function validateWhiteboardAction(
  payload: unknown,
  ids: ActionIdFactory,
  known: ReadonlySet<string> = new Set(),
): ActionValidation {
  if (!isRecord(payload)) return { ok: false, reason: 'payload is not an object' };
  const type = str(payload.type);
  if (!type || !(WB_ACTION_TYPES as readonly string[]).includes(type))
    return { ok: false, reason: `unknown action type ${String(payload.type)}` };

  switch (type as WbActionType) {
    case 'wb_open':
      return { ok: true, action: { id: str(payload.id) ?? ids.actionId(), type: 'wb_open' } };
    case 'wb_clear':
      return { ok: true, action: { id: str(payload.id) ?? ids.actionId(), type: 'wb_clear' } };
    case 'wb_delete': {
      const elementId = str(payload.elementId);
      if (!elementId) return { ok: false, reason: 'wb_delete needs an elementId' };
      if (known.size > 0 && !known.has(elementId))
        return { ok: false, reason: `wb_delete names an element that is not on the board` };
      return {
        ok: true,
        action: { id: str(payload.id) ?? ids.actionId(), type: 'wb_delete', elementId },
      };
    }
    case 'wb_draw_text':
      return text(payload, ids);
    case 'wb_draw_latex':
      return latex(payload, ids);
    case 'wb_draw_shape':
      return shape(payload, ids);
    case 'wb_draw_line':
      return line(payload, ids);
    case 'wb_draw_table':
      return table(payload, ids);
    case 'wb_stroke':
      return stroke(payload, ids);
    case 'wb_highlight':
      return highlight(payload, ids, known);
  }
}

/** The element ids a board holds, for `wb_delete` validation and the prompt summary. */
export function boardElementIds(board: readonly WhiteboardAction[]): Set<string> {
  const ids = new Set<string>();
  for (const action of board) {
    if (action.type === 'wb_clear') ids.clear();
    else if (action.type === 'wb_delete') ids.delete(action.elementId);
    else if ('elementId' in action && typeof action.elementId === 'string')
      ids.add(action.elementId);
  }
  return ids;
}

/** Applies an action to the running board list the session state keeps. */
export function applyToBoard(
  board: readonly WhiteboardAction[],
  action: WhiteboardAction,
): WhiteboardAction[] {
  if (action.type === 'wb_clear') return [];
  if (action.type === 'wb_delete') {
    return board.filter(
      (existing) => !('elementId' in existing) || existing.elementId !== action.elementId,
    );
  }
  if (action.type === 'wb_open' && board.some((existing) => existing.type === 'wb_open')) {
    return [...board];
  }
  if (action.type === 'wb_highlight') {
    // Pointing moves: the highlight with this id is replaced, not stacked.
    return [
      ...board.filter(
        (existing) => !('elementId' in existing) || existing.elementId !== action.elementId,
      ),
      action,
    ];
  }
  return [...board, action];
}

/** One compact line per element for the "Board now" section of the prompt. */
export function describeBoard(board: readonly WhiteboardAction[]): string[] {
  const lines: string[] = [];
  for (const action of board) {
    const at = (x: number, y: number) => `at (${Math.round(x)}, ${Math.round(y)})`;
    const name = 'elementId' in action && action.elementId ? `${action.elementId}: ` : '';
    switch (action.type) {
      case 'wb_open':
        lines.push('board is open');
        break;
      case 'wb_draw_text':
        lines.push(`${name}text "${action.content.slice(0, 60)}" ${at(action.x, action.y)}`);
        break;
      case 'wb_draw_latex':
        lines.push(`${name}latex ${action.latex.slice(0, 60)} ${at(action.x, action.y)}`);
        break;
      case 'wb_draw_shape':
        lines.push(
          `${name}${action.shape} ${Math.round(action.width)}x${Math.round(action.height)} ${at(action.x, action.y)}`,
        );
        break;
      case 'wb_draw_line':
        lines.push(
          `${name}line (${Math.round(action.startX)}, ${Math.round(action.startY)}) to (${Math.round(action.endX)}, ${Math.round(action.endY)})`,
        );
        break;
      case 'wb_draw_table':
        lines.push(
          `${name}table ${action.data.length}x${action.data[0]?.length ?? 0} ${at(action.x, action.y)}`,
        );
        break;
      case 'wb_stroke': {
        const [x, y] = action.points[0] ?? [0, 0];
        lines.push(`${name}stroke of ${action.points.length} points from ${at(x, y)}`);
        break;
      }
      case 'wb_highlight':
        lines.push(
          action.targetId
            ? `${name}highlight on ${action.targetId}`
            : `${name}highlight ${Math.round(action.width ?? 0)}x${Math.round(action.height ?? 0)} ${at(action.x ?? 0, action.y ?? 0)}`,
        );
        break;
      default:
        break;
    }
  }
  return lines;
}
