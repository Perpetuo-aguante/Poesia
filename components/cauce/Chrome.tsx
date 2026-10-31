'use client';

import { useState } from 'react';
import type { Tokens } from './tokens';

export function Wordmark() {
  return (
    <div className="wordmark">
      Geometría Poética
    </div>
  );
}

// The 8-digit seed; click to see what each digit group chose.
export function SeedChip({ tokens, isDefault }: { tokens: Tokens; isDefault: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="seed">
      <button
        type="button"
        className="seed-chip"
        aria-expanded={open}
        aria-controls="seed-panel"
        onClick={() => setOpen(o => !o)}
      >
        <span className="seed-label">semilla</span> {tokens.seed}
      </button>
      {open && (
        <div id="seed-panel" className="seed-panel">
          <p className="seed-intro">
            {isDefault
              ? 'Esta semilla sale del texto del poema: el mismo poema siempre se viste igual.'
              : 'Semilla barajada. Cada grupo de dígitos elige una pieza del estilo.'}
          </p>
          <dl>
            {tokens.explain.map(e => (
              <div key={e.label} className="seed-row">
                <dt>
                  <span className="seed-digits">{e.digits}</span> {e.label}
                </dt>
                <dd>{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
