/**
 * The whiteboard reducer (spec R2; docs/ARCHITECTURE-MAP.md §2.2).
 *
 * The properties that matter for "draw while talking": an action applies
 * synchronously, the element shapes are the ones the upstream canvas renders,
 * ids are stable enough for `wb_delete`, replay after a reload gives the same
 * board, and a malformed or unknown action is ignored rather than fatal.
 */
import { describe, expect, it } from 'vitest';

import type { WhiteboardAction } from '@/lib/tutor/contracts';

import {
  applyBoardAction,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  delimitedLatex,
  EMPTY_BOARD,
  replayBoard,
  toWhiteboard,
  type BoardState,
} from '@/components/tutor/board/reducer';

/**
 * Frames carry an action `id` from `ActionBase`; the reducer never reads it
 * (element identity comes from `elementId`), so the fixtures set one to match
 * the wire rather than because the reducer needs it.
 */
let actionSeq = 0;
function act(action: Record<string, unknown>): WhiteboardAction {
  actionSeq += 1;
  return { id: `act_${actionSeq}`, ...action } as unknown as WhiteboardAction;
}

const text = (over: Record<string, unknown> = {}) =>
  act({
    type: 'wb_draw_text',
    content: 'Two thirds is bigger than one half.',
    x: 80,
    y: 60,
    ...over,
  });

function apply(actions: WhiteboardAction[], from: BoardState = EMPTY_BOARD): BoardState {
  return actions.reduce(applyBoardAction, from);
}

describe('opening, closing, and clearing', () => {
  it('wb_open opens the board and wb_close hides it without discarding the work', () => {
    const opened = apply([act({ type: 'wb_open' }), text()]);
    expect(opened.open).toBe(true);
    expect(opened.elements).toHaveLength(1);

    const closed = applyBoardAction(opened, act({ type: 'wb_close' }));
    expect(closed.open).toBe(false);
    expect(closed.elements).toHaveLength(1);
  });

  it('a draw opens the board on its own, so a missing wb_open never loses an element', () => {
    const state = apply([text()]);
    expect(state.open).toBe(true);
    expect(state.elements).toHaveLength(1);
  });

  it('wb_clear empties the board and keeps it open', () => {
    const state = apply([text(), text({ y: 160 }), act({ type: 'wb_clear' })]);
    expect(state.elements).toEqual([]);
    expect(state.open).toBe(true);
  });

  it('wb_delete removes only the named element', () => {
    const state = apply([
      text({ elementId: 'a' }),
      text({ elementId: 'b', y: 160 }),
      act({ type: 'wb_delete', elementId: 'a' }),
    ]);
    expect(state.elements.map((element) => element.id)).toEqual(['b']);
  });
});

describe('element shapes', () => {
  it('wraps plain text in a paragraph at the requested size and escapes markup', () => {
    const state = apply([text({ content: '1/2 < 2/3 & <b>', fontSize: 28 })]);
    const element = state.elements[0];
    expect(element.type).toBe('text');
    if (element.type !== 'text') throw new Error('expected a text element');
    expect(element.content).toBe('<p style="font-size: 28px;">1/2 &lt; 2/3 &amp; &lt;b&gt;</p>');
    expect(element.left).toBe(80);
    expect(element.top).toBe(60);
    expect(element.width).toBe(400);
  });

  it('renders wb_draw_latex through KaTeX into the html the renderer reads', () => {
    const state = apply([act({ type: 'wb_draw_latex', latex: '\\frac{2}{3}', x: 40, y: 40 })]);
    const element = state.elements[0];
    if (element.type !== 'latex') throw new Error('expected a latex element');
    expect(element.latex).toBe('\\frac{2}{3}');
    expect(element.html).toContain('katex');
  });

  it('routes delimited maths written as text to a latex element', () => {
    expect(delimitedLatex('$\\frac{2}{3}$')).toBe('\\frac{2}{3}');
    expect(delimitedLatex('\\[x^2\\]')).toBe('x^2');
    expect(delimitedLatex('Two thirds costs $3 and $4')).toBeNull();
    expect(delimitedLatex('plain words')).toBeNull();

    const state = apply([text({ content: '$\\frac{1}{2} + \\frac{1}{3}$' })]);
    expect(state.elements[0]?.type).toBe('latex');
  });

  it('turns a line into a bounding box with relative endpoints', () => {
    const state = apply([
      act({
        type: 'wb_draw_line',
        startX: 300,
        startY: 200,
        endX: 100,
        endY: 260,
        points: ['', 'arrow'],
      }),
    ]);
    const element = state.elements[0];
    if (element.type !== 'line') throw new Error('expected a line element');
    expect(element.left).toBe(100);
    expect(element.top).toBe(200);
    expect(element.start).toEqual([200, 0]);
    expect(element.end).toEqual([0, 60]);
    expect(element.points).toEqual(['', 'arrow']);
  });

  it('builds a table with equal column widths and one cell per string', () => {
    const state = apply([
      act({
        type: 'wb_draw_table',
        x: 0,
        y: 0,
        width: 400,
        height: 120,
        data: [
          ['Fraction', 'Decimal'],
          ['1/2', '0.5'],
        ],
      }),
    ]);
    const element = state.elements[0];
    if (element.type !== 'table') throw new Error('expected a table element');
    expect(element.colWidths).toEqual([0.5, 0.5]);
    expect(element.data[1]?.[1]?.text).toBe('0.5');
    expect(element.outline.style).toBe('solid');
  });

  it('gives a shape the viewBox and path the canvas expects', () => {
    const state = apply([
      act({
        type: 'wb_draw_shape',
        shape: 'circle',
        x: 10,
        y: 10,
        width: 60,
        height: 60,
      }),
    ]);
    const element = state.elements[0];
    if (element.type !== 'shape') throw new Error('expected a shape element');
    expect(element.viewBox).toEqual([1000, 1000]);
    expect(element.path).toContain('A 500 500');
  });
});

describe('ids and replay', () => {
  it('mints a distinct id per action when the engine sends none', () => {
    const state = apply([text(), text({ y: 160 }), text({ y: 260 })]);
    const ids = state.elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('a second write to the same elementId replaces it in place', () => {
    const state = apply([
      text({ elementId: 'step', content: 'first' }),
      text({ elementId: 'other', content: 'other', y: 200 }),
      text({ elementId: 'step', content: 'second' }),
    ]);
    expect(state.elements).toHaveLength(2);
    const element = state.elements[0];
    if (element.type !== 'text') throw new Error('expected a text element');
    expect(element.content).toContain('second');
    expect(state.elements[1]?.id).toBe('other');
  });

  it('replaying the same actions rebuilds the same board', () => {
    const actions: WhiteboardAction[] = [
      act({ type: 'wb_open' }),
      text({ elementId: 'a' }),
      act({
        type: 'wb_draw_shape',
        shape: 'rectangle',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      }),
      act({ type: 'wb_delete', elementId: 'a' }),
    ];
    expect(replayBoard(actions)).toEqual(apply(actions));
    expect(replayBoard(actions).elements).toHaveLength(1);
  });

  it('ignores an unknown or malformed action and keeps going', () => {
    const before = apply([text()]);
    const after = apply(
      [
        act({ type: 'wb_draw_widget', x: 1 }),
        act({ type: 'wb_draw_text', content: '   ', x: 0, y: 0 }),
        act({ type: 'wb_delete' }),
        act({ type: 'wb_draw_table', x: 0, y: 0, width: 1, height: 1, data: [] }),
      ],
      before,
    );
    expect(after.elements).toEqual(before.elements);
    expect(after.seq).toBe(before.seq + 4);
  });
});

describe('the prop the canvas renders', () => {
  it('is a whiteboard on the 1000 x 562.5 sheet', () => {
    const whiteboard = toWhiteboard(apply([text()]));
    expect(whiteboard.viewportSize).toBe(BOARD_WIDTH);
    expect(whiteboard.viewportSize * whiteboard.viewportRatio).toBeCloseTo(BOARD_HEIGHT);
    expect(whiteboard.elements).toHaveLength(1);
  });
});

describe('pointing at things (wb_stroke, wb_highlight)', () => {
  const bar = (over: Record<string, unknown> = {}) =>
    act({
      type: 'wb_draw_shape',
      shape: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      elementId: 'bar1',
      ...over,
    });

  it('a stroke is an unfilled shape whose path follows the points inside their box', () => {
    const state = apply([
      act({
        type: 'wb_stroke',
        points: [
          [100, 200],
          [300, 200],
          [300, 260],
        ],
        width: 4,
        color: '#123456',
        elementId: 'ring1',
      }),
    ]);
    const element = state.elements[0];
    if (element?.type !== 'shape') throw new Error('expected a shape element');
    expect(element.id).toBe('ring1');
    expect(element.fill).toBe('none');
    expect(element.outline).toEqual({ width: 4, style: 'solid', color: '#123456' });
    // pad = width / 2 + 1 = 3 on every side
    expect([element.left, element.top, element.width, element.height]).toEqual([97, 197, 206, 66]);
    expect(element.viewBox).toEqual([206, 66]);
    expect(element.path).toBe('M 3 3 L 203 3 L 203 63');
    expect(state.open).toBe(true);
  });

  it('a flat underline still gets a box with height, and the defaults are a red 3 px stroke', () => {
    const state = apply([
      act({
        type: 'wb_stroke',
        points: [
          [40, 90],
          [140, 90],
        ],
      }),
    ]);
    const element = state.elements[0];
    if (element?.type !== 'shape') throw new Error('expected a shape element');
    expect(element.height).toBe(5);
    expect(element.outline).toEqual({ width: 3, style: 'solid', color: '#d14424' });
    expect(element.path).toBe('M 2.5 2.5 L 102.5 2.5');
  });

  it('a stroke with fewer than two usable points changes nothing but the sequence', () => {
    const state = apply([act({ type: 'wb_stroke', points: [[1, 2], 'x'] })]);
    expect(state.elements).toEqual([]);
    expect(state.seq).toBe(1);
  });

  it('a highlight over a drawn element wraps its box with padding and is translucent', () => {
    const state = apply([bar(), act({ type: 'wb_highlight', targetId: 'bar1' })]);
    const element = state.elements[1];
    if (element?.type !== 'shape') throw new Error('expected a shape element');
    expect(element.id).toBe('highlight');
    expect([element.left, element.top, element.width, element.height]).toEqual([92, 92, 216, 56]);
    expect(element.fill).toBe('#ffd166');
    expect(element.opacity).toBe(0.35);
    expect(element.name).toBe('highlight:bar1');
  });

  it('a highlight over a line covers the line extent, and a region highlight uses the region', () => {
    const overLine = apply([
      act({
        type: 'wb_draw_line',
        startX: 100,
        startY: 300,
        endX: 400,
        endY: 300,
        elementId: 'nl',
      }),
      act({ type: 'wb_highlight', targetId: 'nl', color: '#00ff00', opacity: 0.5 }),
    ]);
    const box = overLine.elements[1];
    if (box?.type !== 'shape') throw new Error('expected a shape element');
    expect([box.left, box.top, box.width, box.height]).toEqual([92, 292, 316, 17]);
    expect(box.fill).toBe('#00ff00');
    expect(box.opacity).toBe(0.5);

    const region = apply([
      act({ type: 'wb_highlight', x: 10, y: 20, width: 30, height: 40, elementId: 'h2' }),
    ]);
    const area = region.elements[0];
    if (area?.type !== 'shape') throw new Error('expected a shape element');
    expect([area.id, area.left, area.top, area.width, area.height]).toEqual(['h2', 10, 20, 30, 40]);
    expect(area.name).toBeUndefined();
  });

  it('a highlight of something not on the board, or of no region, changes nothing but the sequence', () => {
    const missing = apply([act({ type: 'wb_highlight', targetId: 'ghost' })]);
    expect(missing.elements).toEqual([]);
    expect(missing.seq).toBe(1);
    const empty = apply([act({ type: 'wb_highlight' })]);
    expect(empty.elements).toEqual([]);
  });

  it('the next highlight replaces the last in place, and deleting the target removes its highlight', () => {
    const moved = apply([
      bar(),
      bar({ elementId: 'bar2', y: 200 }),
      act({ type: 'wb_highlight', targetId: 'bar1' }),
      act({ type: 'wb_highlight', targetId: 'bar2' }),
    ]);
    expect(moved.elements.map((element) => element.id)).toEqual(['bar1', 'bar2', 'highlight']);
    const box = moved.elements[2];
    if (box?.type !== 'shape') throw new Error('expected a shape element');
    expect(box.top).toBe(192);

    const deleted = applyBoardAction(moved, act({ type: 'wb_delete', elementId: 'bar2' }));
    expect(deleted.elements.map((element) => element.id)).toEqual(['bar1']);
  });

  it('strokes and highlights replay to the same board', () => {
    const actions = [
      bar(),
      act({
        type: 'wb_stroke',
        points: [
          [100, 150],
          [300, 150],
        ],
      }),
      act({ type: 'wb_highlight', targetId: 'bar1' }),
    ];
    expect(replayBoard(actions)).toEqual(apply(actions));
  });
});
