'use client';

import { ReactNode, useEffect } from 'react';
import { applyTokens, deriveTokens } from './tokens';
import { useReducedMotion } from './CauceView';
import { GLYPHS } from './dock/glyphs';
import { Wordmark } from './Chrome';

// Seed for the screens before a poem exists: Lecho, Fraunces, Espina.
const WELCOME_SEED = '00040100';

export function useWelcomeTokens(active: boolean) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (active) applyTokens(deriveTokens(WELCOME_SEED), reduced);
  }, [active, reduced]);
}

export function Welcome({ onStart }: { onStart: () => void }) {
  useWelcomeTokens(true);
  return (
    <div className="welcome">
      <div className="grain" aria-hidden />
      <header className="chrome">
        <Wordmark />
      </header>
      <main className="welcome-main">
        <h1 className="welcome-title">
          Un poema,
          <br />
          su geometría.
        </h1>
        <p className="welcome-lede">
          Pega un poema y míralo convertido en forma: la métrica, el acento, la rima y la emoción de cada verso se
          dibujan a pantalla completa, con el texto compuesto encima.
        </p>
        <button type="button" className="pill-btn" onClick={onStart}>
          <span className="glyph">{GLYPHS.add}</span>
          Añadir un poema
        </button>
      </main>
    </div>
  );
}

// Full-screen sheet that hosts the existing poem input.
export function InputSheet({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-inner">
        <h2 className="sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="loading-mark" aria-hidden>{GLYPHS.mandala}</span>
      Preparando las geometrías…
    </div>
  );
}
