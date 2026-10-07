/**
 * The scene source the board's canvas reads.
 *
 * Upstream's `ScreenElement` (`components/slide-renderer/Editor/ScreenElement.tsx`)
 * reads the scene theme through `SceneProvider` (`lib/contexts/scene-context.tsx`),
 * which normally follows the classroom's stage store and throws without a
 * provider. That is what every drawn element did in the session until the
 * step-3 screenshot pass caught it. The board is not a scene, so the canvas
 * gets a fixed, read-only source: the theme every element inherits, and an
 * update that goes nowhere, because the reducer owns the board.
 *
 * Framework-free so it can be tested without a DOM. The snapshot is one stable
 * object, as `useSyncExternalStore` requires.
 */
import type { SceneDataController } from '@/lib/contexts/scene-context';

export const BOARD_SCENE_CONTENT = {
  type: 'slide',
  canvas: {
    theme: {
      backgroundColor: '#ffffff',
      themeColors: ['#5b9bd5'],
      fontColor: '#333333',
      fontName: 'Inter, system-ui, sans-serif',
    },
  },
} as const;

export const BOARD_SCENE: SceneDataController = {
  sceneId: 'tutor-board',
  sceneType: 'slide',
  getSnapshot: () => BOARD_SCENE_CONTENT,
  updateSceneData: () => {},
};
