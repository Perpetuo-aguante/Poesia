'use client';

import { RefObject, useEffect, useRef } from 'react';
import { ArtStage } from './types';

// `rate` scales per-frame motion (1 = normal, 0 = frozen); pieces that only
// read `t` can ignore it.
export type DrawFn = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number, frame: number, rate?: number) => void;

// Runs `draw` every animation frame on a HiDPI-aware 2D canvas.
// `setup` runs once per (re)start and returns the per-frame draw function,
// so pieces can precompute geometry from the fingerprint.
// With prefers-reduced-motion a single still is drawn (after `settleFrames`
// steps, for pieces that build up over time like trails).
export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement>,
  width: number,
  height: number,
  setup: (ctx: CanvasRenderingContext2D, w: number, h: number) => DrawFn,
  deps: unknown[],
  settleFrames = 1,
  stage?: ArtStage,
  fps = 60,
) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = setupRef.current(ctx, width, height);

    // On the Cauce stage the shared ticker drives the frame and the clock.
    if (stage) {
      let frame = 0;
      for (let f = 0; f < Math.min(settleFrames, 90); f++) draw(ctx, stage.time(), width, height, frame++, 1);
      return stage.subscribe(fps, () => {
        if (stage.visible()) draw(ctx, stage.time(), width, height, frame++, stage.rate());
      });
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      for (let f = 0; f < settleFrames; f++) draw(ctx, 12 + f / 60, width, height, f);
      return;
    }

    let raf = 0;
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      draw(ctx, (now - start) / 1000, width, height, frame++);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, width, height, stage, fps, ...deps]);
}
