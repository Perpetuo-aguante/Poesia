'use client';

import { CSSProperties, KeyboardEvent, PointerEvent, useRef, useState } from 'react';
import { ART_PIECES } from '@/components/art';
import type { LayerState } from '../layers/Stage';
import { GLYPHS } from './glyphs';

interface Props {
  layers: LayerState[];
  onLayers: (next: LayerState[]) => void;
  onShuffle: () => void;
  onAddPoem: () => void;
  onRead: () => void;
}

const HOLD_MS = 500;
const DRAG_PX = 120; // pointer travel for 0 → 100 %
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const pct = (v: number) => `${Math.round(v * 100)}%`;

// Click toggles, vertical drag sets opacity, a 500 ms hold solos the layer
// (hold again to restore). Keyboard: Enter/Space toggle, arrows ±10 %.
function LayerButton({
  label, glyph, state, onChange, onHold, soloed,
}: {
  label: string;
  glyph: JSX.Element;
  state: LayerState;
  onChange: (s: LayerState) => void;
  onHold: () => void;
  soloed: boolean;
}) {
  const gesture = useRef<{ y: number; o: number; dragged: boolean; held: boolean; timer: number } | null>(null);
  const [tip, setTip] = useState(false);
  const [active, setActive] = useState(false);

  const end = () => {
    const g = gesture.current;
    if (g) window.clearTimeout(g.timer);
    gesture.current = null;
    setActive(false);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const timer = window.setTimeout(() => {
      if (gesture.current && !gesture.current.dragged) {
        gesture.current.held = true;
        onHold();
      }
    }, HOLD_MS);
    gesture.current = { y: e.clientY, o: state.on ? state.opacity : 0, dragged: false, held: false, timer };
    setActive(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current;
    if (!g || g.held) return;
    const dy = g.y - e.clientY;
    if (!g.dragged && Math.abs(dy) < 5) return;
    if (!g.dragged) {
      g.dragged = true;
      window.clearTimeout(g.timer);
    }
    const o = clamp01(g.o + dy / DRAG_PX);
    onChange({ on: o > 0.01, opacity: o > 0.01 ? o : state.opacity });
  };

  const onPointerUp = () => {
    const g = gesture.current;
    if (g && !g.dragged && !g.held) onChange({ ...state, on: !state.on });
    end();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange({ ...state, on: !state.on });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const base = state.on ? state.opacity : 0;
      const o = clamp01(Math.round((base + (e.key === 'ArrowUp' ? 0.1 : -0.1)) * 10) / 10);
      onChange({ on: o > 0.01, opacity: o > 0.01 ? o : state.opacity });
    }
  };

  const shown = state.on ? state.opacity : 0;
  return (
    <button
      type="button"
      className="dock-btn layer-btn"
      aria-pressed={state.on}
      aria-label={`${label}: ${state.on ? `visible al ${pct(state.opacity)}` : 'oculta'}. Arrastra hacia arriba o abajo para cambiar la opacidad; mantén presionado para dejarla sola.`}
      data-off={state.on ? undefined : ''}
      data-active={active ? '' : undefined}
      data-solo={soloed ? '' : undefined}
      style={{ '--meter': shown } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={end}
      onPointerEnter={() => setTip(true)}
      onPointerLeave={() => setTip(false)}
      onFocus={() => setTip(true)}
      onBlur={() => setTip(false)}
      onKeyDown={onKeyDown}
      onContextMenu={e => e.preventDefault()}
    >
      <span className="meter" aria-hidden />
      <span className="glyph">{glyph}</span>
      {(tip || active) && (
        <span className="dock-tip" role="status">
          {label} · {state.on ? pct(state.opacity) : 'oculta'}
          {soloed ? ' · sola' : ''}
        </span>
      )}
    </button>
  );
}

export default function Dock({ layers, onLayers, onShuffle, onAddPoem, onRead }: Props) {
  const saved = useRef<LayerState[] | null>(null);
  const [solo, setSolo] = useState(-1);

  const setOne = (i: number, s: LayerState) => {
    saved.current = null;
    setSolo(-1);
    onLayers(layers.map((l, k) => (k === i ? s : l)));
  };

  const hold = (i: number) => {
    if (saved.current) {
      onLayers(saved.current);
      saved.current = null;
      setSolo(-1);
    } else {
      saved.current = layers;
      setSolo(i);
      onLayers(layers.map((l, k) => ({ on: k === i, opacity: k === i ? Math.max(l.opacity, 0.6) : l.opacity })));
    }
  };

  return (
    <nav className="dock" aria-label="Capas y controles">
      <div className="dock-group" role="group" aria-label="Capas">
        {ART_PIECES.map(({ meta }, i) => (
          <LayerButton
            key={meta.id}
            label={meta.label}
            glyph={GLYPHS[meta.id]}
            state={layers[i]}
            soloed={solo === i}
            onChange={s => setOne(i, s)}
            onHold={() => hold(i)}
          />
        ))}
      </div>
      <span className="dock-divider" aria-hidden />
      <button type="button" className="dock-btn" aria-label="Barajar la semilla de estilo" onClick={onShuffle}>
        <span className="glyph">{GLYPHS.shuffle}</span>
        <span className="dock-tip dock-tip-hover">Barajar estilo</span>
      </button>
      <button type="button" className="dock-btn" aria-label="Leer el poema con su escansión" onClick={onRead}>
        <span className="glyph">{GLYPHS.read}</span>
        <span className="dock-tip dock-tip-hover">Lectura y escansión</span>
      </button>
      <button type="button" className="dock-btn" aria-label="Cambiar poema" onClick={onAddPoem}>
        <span className="glyph">{GLYPHS.add}</span>
        <span className="dock-tip dock-tip-hover">Cambiar poema</span>
      </button>
    </nav>
  );
}
