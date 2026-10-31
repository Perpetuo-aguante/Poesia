'use client';

import { CSSProperties, PointerEvent, KeyboardEvent, RefObject, useRef } from 'react';

export interface RailTick {
  at: number; // 0–1 scroll position of the stanza
  color: string;
  label: string;
}

interface Props {
  ticks: RailTick[];
  thumbRef: RefObject<HTMLDivElement>;
}

function scrollToFraction(f: number, smooth = false) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: Math.max(0, Math.min(1, f)) * max, behavior: smooth ? 'smooth' : 'auto' });
}

// A hairline on the right edge: one tick per stanza, a thumb for the playhead.
// Click or drag anywhere on it to scrub.
export default function ScrollRail({ ticks, thumbRef }: Props) {
  const railRef = useRef<HTMLDivElement>(null);

  const fromPointer = (e: PointerEvent) => {
    const r = railRef.current!.getBoundingClientRect();
    scrollToFraction((e.clientY - r.top) / r.height);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = window.scrollY / Math.max(1, max);
    const stops = [0, ...ticks.map(t => t.at)];
    const next = e.key === 'ArrowDown' ? stops.find(s => s > p + 0.01) : [...stops].reverse().find(s => s < p - 0.01);
    if (next !== undefined) scrollToFraction(next, true);
  };

  return (
    <div
      ref={railRef}
      className="rail"
      role="slider"
      tabIndex={0}
      aria-label="Recorrido del poema por estrofas"
      aria-valuemin={0}
      aria-valuemax={ticks.length}
      aria-valuenow={0}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e);
      }}
      onPointerMove={e => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
      onKeyDown={onKey}
    >
      {ticks.map(t => (
        <span key={t.label} className="rail-tick" title={t.label} style={{ '--at': t.at, '--tick': t.color } as CSSProperties} />
      ))}
      <div ref={thumbRef} className="rail-thumb" />
    </div>
  );
}
