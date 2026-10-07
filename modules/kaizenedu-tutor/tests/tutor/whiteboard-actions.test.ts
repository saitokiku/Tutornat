/**
 * The whiteboard validator's two pointing verbs (reference §6, "a tutor
 * points at things; today it can only place things"): a stroke is a polyline
 * the tutor draws by hand, a highlight is a translucent box over an element
 * that is on the board or over a region. Both arrive untrusted from the model
 * and are clamped or dropped like every other `[[wb ...]]` payload.
 */
import { describe, expect, it } from 'vitest';

import {
  applyToBoard,
  boardElementIds,
  createIdFactory,
  describeBoard,
  HIGHLIGHT_ELEMENT_ID,
  STROKE_MAX_POINTS,
  validateWhiteboardAction,
  WB_ACTION_TYPES,
} from '@/lib/tutor/turn/actions';
import type { WhiteboardAction } from '@/lib/tutor/contracts';

function accept(payload: unknown, known?: ReadonlySet<string>): WhiteboardAction {
  const result = validateWhiteboardAction(payload, createIdFactory('t1'), known);
  if (!result.ok) throw new Error(`expected an accepted action, got: ${result.reason}`);
  return result.action;
}

function reason(payload: unknown, known?: ReadonlySet<string>): string {
  const result = validateWhiteboardAction(payload, createIdFactory('t1'), known);
  if (result.ok) throw new Error(`expected a drop, got ${result.action.type}`);
  return result.reason;
}

function stroke(payload: unknown) {
  const action = accept(payload);
  if (action.type !== 'wb_stroke') throw new Error(`expected wb_stroke, got ${action.type}`);
  return action;
}

function highlight(payload: unknown, known?: ReadonlySet<string>) {
  const action = accept(payload, known);
  if (action.type !== 'wb_highlight') throw new Error(`expected wb_highlight, got ${action.type}`);
  return action;
}

describe('wb_stroke', () => {
  it('accepts a polyline, pulls a stray point back to the sheet, and caps the width', () => {
    const action = stroke({
      type: 'wb_stroke',
      points: [
        [100, 200],
        [300, 200],
        [1200, -5],
      ],
      width: 40,
      color: '#ff0000',
    });
    expect(action.points).toEqual([
      [100, 200],
      [300, 200],
      [1000, 0],
    ]);
    expect(action.width).toBe(12);
    expect(action.color).toBe('#ff0000');
    expect(action.elementId).toBe('stroke_t1_1');
    expect(action.id).toBe('act_t1_1');
  });

  it('takes {x, y} objects and numeric strings as points, and leaves width and color unset when absent', () => {
    const action = stroke({
      type: 'wb_stroke',
      points: [
        { x: '10', y: '20' },
        { x: 30, y: 40 },
      ],
    });
    expect(action.points).toEqual([
      [10, 20],
      [30, 40],
    ]);
    expect(action.width).toBeUndefined();
    expect(action.color).toBeUndefined();
  });

  it('drops a stroke with fewer than two points, a malformed point, or no length', () => {
    expect(reason({ type: 'wb_stroke', points: [[1, 2]] })).toBe(
      'wb_stroke needs at least two points',
    );
    expect(reason({ type: 'wb_stroke', points: [[1, 2], 'nope'] })).toBe(
      'wb_stroke has a point that is not [x, y]',
    );
    expect(reason({ type: 'wb_stroke', points: 'M 0 0' })).toBe('wb_stroke needs points');
    expect(
      reason({
        type: 'wb_stroke',
        points: [
          [50, 50],
          [50, 50],
        ],
      }),
    ).toBe('wb_stroke has zero length');
  });

  it('keeps at most the point cap', () => {
    const points = Array.from({ length: STROKE_MAX_POINTS + 50 }, (_, i) => [i, i % 7]);
    expect(stroke({ type: 'wb_stroke', points }).points).toHaveLength(STROKE_MAX_POINTS);
  });
});

describe('wb_highlight', () => {
  const board = new Set(['bar1', 'line1']);

  it('points at an element on the board and takes the shared id unless given one', () => {
    const action = highlight({ type: 'wb_highlight', targetId: 'bar1' }, board);
    expect(action.targetId).toBe('bar1');
    expect(action.elementId).toBe(HIGHLIGHT_ELEMENT_ID);
    expect(action.x).toBeUndefined();

    const named = highlight({ type: 'wb_highlight', targetId: 'line1', elementId: 'h2' }, board);
    expect(named.elementId).toBe('h2');
  });

  it('drops a target that is not on the board, and a highlight of itself', () => {
    expect(reason({ type: 'wb_highlight', targetId: 'ghost' }, board)).toBe(
      'wb_highlight names an element that is not on the board',
    );
    expect(reason({ type: 'wb_highlight', targetId: 'highlight' }, board)).toBe(
      'wb_highlight cannot target itself',
    );
  });

  it('accepts a region and clamps it to the sheet', () => {
    const action = highlight({ type: 'wb_highlight', x: 900, y: 500, width: 300, height: 300 });
    expect([action.x, action.y, action.width, action.height]).toEqual([900, 500, 100, 62.5]);
  });

  it('drops a highlight with neither a target nor a usable region', () => {
    expect(reason({ type: 'wb_highlight' })).toBe('wb_highlight needs a targetId or a region');
    expect(reason({ type: 'wb_highlight', x: 2000, y: 10, width: 10, height: 10 })).toBe(
      'wb_highlight region is off the sheet',
    );
    expect(reason({ type: 'wb_highlight', x: 10, y: 10, width: 0, height: 10 })).toBe(
      'wb_highlight needs a positive width and height on the sheet',
    );
  });

  it('clamps opacity into a range that still shows the element underneath', () => {
    expect(highlight({ type: 'wb_highlight', targetId: 'bar1', opacity: 5 }, board).opacity).toBe(
      0.8,
    );
    expect(highlight({ type: 'wb_highlight', targetId: 'bar1', opacity: 0 }, board).opacity).toBe(
      0.1,
    );
    expect(highlight({ type: 'wb_highlight', targetId: 'bar1' }, board).opacity).toBeUndefined();
  });

  it('replaces the previous highlight on the running board and reads back in the summary', () => {
    const bar = accept({
      type: 'wb_draw_shape',
      shape: 'rectangle',
      x: 40,
      y: 40,
      width: 200,
      height: 60,
      elementId: 'bar1',
    });
    let running = applyToBoard([], bar);
    running = applyToBoard(running, highlight({ type: 'wb_highlight', targetId: 'bar1' }, board));
    running = applyToBoard(
      running,
      highlight({ type: 'wb_highlight', x: 10, y: 10, width: 50, height: 50 }),
    );
    expect(running.filter((action) => action.type === 'wb_highlight')).toHaveLength(1);
    expect(boardElementIds(running)).toEqual(new Set(['bar1', HIGHLIGHT_ELEMENT_ID]));
    expect(describeBoard(running)).toEqual([
      'bar1: rectangle 200x60 at (40, 40)',
      'highlight: highlight 50x50 at (10, 10)',
    ]);

    running = applyToBoard(running, highlight({ type: 'wb_highlight', targetId: 'bar1' }, board));
    expect(describeBoard(running).at(-1)).toBe('highlight: highlight on bar1');

    // A highlight with its own id stacks instead of replacing the shared one.
    running = applyToBoard(
      running,
      highlight({ type: 'wb_highlight', targetId: 'bar1', elementId: 'h2' }, board),
    );
    expect(running.filter((action) => action.type === 'wb_highlight')).toHaveLength(2);
  });
});

describe('the vocabulary', () => {
  it('offers ten verbs: the eight placing ones plus stroke and highlight', () => {
    expect([...WB_ACTION_TYPES]).toEqual([
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
    ]);
  });

  it('a stroke describes itself by its point count and start', () => {
    const running = applyToBoard(
      [],
      stroke({
        type: 'wb_stroke',
        points: [
          [12.4, 30],
          [80, 30],
        ],
        elementId: 'under1',
      }),
    );
    expect(describeBoard(running)).toEqual(['under1: stroke of 2 points from at (12, 30)']);
  });
});
