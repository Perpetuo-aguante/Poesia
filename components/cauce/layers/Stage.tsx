'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PoemFingerprint } from '@/lib/fingerprint';
import { ART_PIECES } from '@/components/art';
import type { ArtStage, ArtTheme } from '@/components/art/types';
import type { Tokens } from '../tokens';
import type { StageRuntime } from './runtime';
import { subscribe } from './ticker';

export interface LayerState {
  on: boolean;
  opacity: number; // 0–1
}

interface Props {
  fingerprint: PoemFingerprint;
  tokens: Tokens;
  runtime: StageRuntime;
  layers: LayerState[];
}

// Viewport size; ignores small height-only changes (mobile URL bar).
function useViewport() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setSize(prev => (prev.w === w && Math.abs(prev.h - h) < 120 && prev.h ? prev : { w, h }));
    };
    const onResize = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);
  return size;
}

// The five geometries, edge to edge and stacked. Every layer is always
// mounted; a switched-off layer simply skips drawing.
export default function Stage({ fingerprint, tokens, runtime, layers }: Props) {
  const { w, h } = useViewport();
  const stageRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const theme: ArtTheme = useMemo(
    () => ({ ink: tokens.rgb.ink, ground: tokens.rgb.ground, tone: tokens.tone, mono: tokens.type.mono, key: `${tokens.palette.name}|${tokens.type.mono}` }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokens.palette.name, tokens.type.mono],
  );

  const stages: ArtStage[] = useMemo(
    () =>
      ART_PIECES.map((_, i) => ({
        theme,
        lit: runtime.lit,
        time: () => runtime.time,
        rate: () => runtime.rate,
        subscribe: (fps: number, cb: () => void) => subscribe(fps, cb, 10 + i),
        visible: () => {
          const l = layersRef.current[i];
          return !!l && l.on && l.opacity > 0.01;
        },
      })),
    [theme, runtime],
  );

  // Pulse motion breathes the whole stage's amplitude.
  useEffect(
    () =>
      runtime.onFrame(() => {
        stageRef.current?.style.setProperty('--pulse', runtime.pulse.toFixed(3));
      }),
    [runtime],
  );

  return (
    <div ref={stageRef} className="stage" aria-hidden>
      {w > 0 &&
        ART_PIECES.map(({ meta, Component }, i) => {
          const l = layers[i];
          return (
            <div
              key={meta.id}
              className="stage-layer"
              data-layer={meta.id}
              style={{ opacity: l.on ? l.opacity : 0 }}
            >
              <Component
                key={`${meta.id}-${fingerprint.seed}-${fingerprint.source}`}
                fingerprint={fingerprint}
                width={w}
                height={h}
                stage={stages[i]}
              />
            </div>
          );
        })}
    </div>
  );
}
