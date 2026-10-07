'use client';

import { useMemo } from 'react';
import { PenLine } from 'lucide-react';

import { WhiteboardCanvas } from '@/components/whiteboard/whiteboard-canvas';
import { SceneProvider } from '@/lib/contexts/scene-context';

import type { BoardState } from './reducer';
import { toWhiteboard } from './reducer';
import { BOARD_SCENE } from './scene';

/**
 * The whiteboard tile. `WhiteboardCanvas` is the upstream component
 * `docs/ARCHITECTURE-MAP.md` §2.2 marks KEEP ("strongest asset in the tree;
 * inject `whiteboard` by prop"), so the board arrives as a prop built by the
 * reducer and this file adds only the tile's own states: nothing drawn yet,
 * and drawn-then-closed. The canvas's elements read a scene theme through
 * `SceneProvider`; `BOARD_SCENE` is the read-only source that stands in for
 * the classroom's stage store.
 *
 * There is no animation queue between an `action` frame and the element
 * appearing — the reducer is synchronous, so the board keeps up with the
 * sentence being spoken instead of trailing it by the upstream engine's
 * per-action sleep.
 */
export function BoardPane({ board, busy }: { board: BoardState; busy: boolean }) {
  const whiteboard = useMemo(() => toWhiteboard(board), [board]);
  const drawn = board.elements.length > 0;

  return (
    <section className="nt-tile nt-board" aria-label="Whiteboard">
      <div className="nt-tile-bar">
        <span className="nt-tile-label">
          <PenLine className="size-4" aria-hidden="true" />
          Whiteboard
        </span>
        {drawn ? (
          <span className="nt-small" aria-live="polite">
            {board.elements.length} {board.elements.length === 1 ? 'item' : 'items'}
          </span>
        ) : null}
      </div>
      <div className="nt-board-sheet">
        {drawn && board.open ? (
          <SceneProvider controller={BOARD_SCENE}>
            <WhiteboardCanvas whiteboard={whiteboard} />
          </SceneProvider>
        ) : (
          <div className="nt-board-empty">
            <p className="nt-body">
              {drawn
                ? 'The tutor put the board away. It comes back when there is something to draw.'
                : busy
                  ? 'The tutor will draw here when it helps.'
                  : 'Nothing on the board yet.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
