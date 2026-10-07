/**
 * Invariant (c): no camera frame, face landmark, embedding, or template leaves
 * the browser (CLAUDE.md; spec D16, §5.10 B).
 *
 * While no camera feature exists this is a capability-absence check: no file
 * may open a camera (`getUserMedia` with a `video` constraint, `ImageCapture`,
 * `getDisplayMedia`, a face-landmark model) outside the presence modules.
 * Microphone capture (`getUserMedia({ audio })`) is invariant (b)'s concern
 * and is not flagged here. When presence-41 lands, camera code lives under
 * `components/tutor/presence/` and `lib/tutor/presence/` and may not contain a
 * network call; the coarse attention state is sent by a separate reporter that
 * never references a capture API. presence-42 adds the runtime network audit.
 */
import { describe, expect, it } from 'vitest';

import { listFiles, readRepoFile } from './_helpers';

const CAMERA_APIS =
  /\bnew ImageCapture\b|getDisplayMedia\s*\(|\bFaceLandmarker\b|@mediapipe\/tasks-vision|MediaStreamTrackProcessor|\.captureStream\s*\(/;
const NETWORK_APIS =
  /\bfetch\s*\(|new WebSocket|sendBeacon|XMLHttpRequest|EventSource\s*\(|\bpostMessage\s*\(/;
const PRESENCE_ROOTS = ['components/tutor/presence', 'lib/tutor/presence'] as const;

function isPresenceFile(file: string): boolean {
  return PRESENCE_ROOTS.some((root) => file.startsWith(`${root}/`));
}

/** Drop line comments and block comments so documentation cannot trip the scan. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

interface CaptureUse {
  file: string;
  kind: 'camera' | 'mic';
}

/** Every getUserMedia call site, classified by whether its constraint block asks for video. */
function getUserMediaUses(file: string, source: string): CaptureUse[] {
  const uses: CaptureUse[] = [];
  for (const match of source.matchAll(/getUserMedia\s*\(/g)) {
    const window = source.slice(match.index ?? 0, (match.index ?? 0) + 400);
    uses.push({ file, kind: /\bvideo\b/.test(window) ? 'camera' : 'mic' });
  }
  return uses;
}

describe('invariant (c): no camera data egress', () => {
  const sourceFiles = ['lib', 'components', 'app'].flatMap((root) =>
    listFiles(root, { extensions: ['.ts', '.tsx'] }),
  );
  const sources = new Map(sourceFiles.map((file) => [file, stripComments(readRepoFile(file))]));
  const captureUses = [...sources].flatMap(([file, source]) => getUserMediaUses(file, source));

  it('the scan sees real getUserMedia call sites (prevents a vacuous pass)', () => {
    expect(captureUses.map((use) => use.file)).toContain('lib/hooks/use-audio-recorder.ts');
  });

  it('no file outside the presence modules opens a camera', () => {
    const cameraFiles = new Set<string>();
    for (const use of captureUses) if (use.kind === 'camera') cameraFiles.add(use.file);
    for (const [file, source] of sources) if (CAMERA_APIS.test(source)) cameraFiles.add(file);
    const offenders = [...cameraFiles].filter((file) => !isPresenceFile(file)).sort();
    expect(
      offenders,
      'files outside components/tutor/presence and lib/tutor/presence that open a camera',
    ).toEqual([]);
  });

  it('presence modules that open a camera make no network calls', () => {
    const leaks: string[] = [];
    for (const [file, source] of sources) {
      if (!isPresenceFile(file)) continue;
      const opensCamera =
        CAMERA_APIS.test(source) ||
        getUserMediaUses(file, source).some((use) => use.kind === 'camera');
      if (opensCamera && NETWORK_APIS.test(source)) leaks.push(file);
    }
    const presenceCount = sourceFiles.filter(isPresenceFile).length;
    expect(
      leaks,
      `camera modules with network calls (${presenceCount} presence files scanned)`,
    ).toEqual([]);
  });
});
