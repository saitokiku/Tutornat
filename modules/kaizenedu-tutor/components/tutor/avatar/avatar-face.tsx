'use client';

import { useEffect, useRef } from 'react';

import type { AvatarState, ReactionKind } from '@/lib/tutor/contracts';

import { createAvatarDriver } from './create-driver';
import type { AvatarDriver, AvatarGaze } from './driver';

export interface AvatarFaceProps {
  state: AvatarState;
  gaze: AvatarGaze;
  /**
   * Pulled once per frame while the tutor is speaking. It is a function, not a
   * number, so the playback queue's analyser can drive the mouth without
   * re-rendering the session screen sixty times a second.
   */
  amplitude: () => number;
  /** A new `at` fires the reaction; the same one never fires twice. */
  reaction: { kind: ReactionKind; at: number } | null;
  label: string;
}

/**
 * Mounts the rig into a host element and feeds it. The driver is created once
 * per mount by `create-driver.ts`, which is the only place that knows which
 * rig is on screen: nothing here, and nothing above it, can tell whether it is
 * the built-in SVG character or a commissioned Rive one.
 */
export function AvatarFace({ state, gaze, amplitude, reaction, label }: AvatarFaceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const driverRef = useRef<AvatarDriver | null>(null);
  const amplitudeRef = useRef(amplitude);

  // The rAF pump reads the latest getter without restarting the loop.
  useEffect(() => {
    amplitudeRef.current = amplitude;
  }, [amplitude]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const driver = createAvatarDriver(host, { label });
    driverRef.current = driver;
    let frame = 0;
    const pump = () => {
      driver.setMouth(amplitudeRef.current());
      frame = requestAnimationFrame(pump);
    };
    frame = requestAnimationFrame(pump);
    return () => {
      cancelAnimationFrame(frame);
      driverRef.current = null;
      driver.dispose();
    };
  }, [label]);

  useEffect(() => {
    driverRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    driverRef.current?.setGaze(gaze);
  }, [gaze]);

  useEffect(() => {
    if (!reaction) return;
    driverRef.current?.react(reaction.kind);
  }, [reaction]);

  return <div ref={hostRef} className="nt-avatar-host" aria-hidden={false} />;
}
