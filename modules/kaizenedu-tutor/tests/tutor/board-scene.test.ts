/**
 * The board pane's canvas is upstream's, and its elements read a scene theme
 * through `SceneProvider`; without one every drawn element threw and the
 * session fell into its error boundary. This pins the read-only scene source
 * and that the pane actually wraps the canvas in it.
 */
import { describe, expect, it } from 'vitest';

import { BOARD_SCENE, BOARD_SCENE_CONTENT } from '@/components/tutor/board/scene';

import { readRepoFile } from '../invariants/_helpers';

describe('the board scene source', () => {
  it('is a slide-typed, read-only source with a stable snapshot', () => {
    expect(BOARD_SCENE.sceneType).toBe('slide');
    expect(BOARD_SCENE.sceneId).toBe('tutor-board');
    // useSyncExternalStore re-renders forever on a snapshot that changes identity.
    expect(BOARD_SCENE.getSnapshot()).toBe(BOARD_SCENE.getSnapshot());
    expect(BOARD_SCENE.getSnapshot()).toBe(BOARD_SCENE_CONTENT);
    expect(BOARD_SCENE_CONTENT.canvas.theme.fontColor).toBe('#333333');
    // An update from the canvas goes nowhere: the reducer owns the board.
    expect(() => BOARD_SCENE.updateSceneData(() => {})).not.toThrow();
  });

  it('the pane wraps the canvas in the provider with that source', () => {
    const pane = readRepoFile('components/tutor/board/board-pane.tsx');
    expect(pane).toMatch(
      /<SceneProvider controller=\{BOARD_SCENE\}>\s*<WhiteboardCanvas whiteboard=\{whiteboard\} \/>\s*<\/SceneProvider>/,
    );
  });

  it('upstream still reads the theme through the provider, which is why the source exists', () => {
    const element = readRepoFile('components/slide-renderer/Editor/ScreenElement.tsx');
    expect(element).toContain('useSceneSelector');
  });
});
