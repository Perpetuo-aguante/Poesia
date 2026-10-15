'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { parsePoem, ParsedPoem } from '@/lib/poemParser';
import PoemInput from '@/components/PoemInput';
import ModeSelector from '@/components/ModeSelector';
import PoemLegend from '@/components/PoemLegend';
import PoemReading from '@/components/PoemReading';
import { VisMode } from '@/components/PoemVisualizer';

// Load the canvas component client-only (no SSR)
const PoemVisualizer = dynamic(() => import('@/components/PoemVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[900/520] bg-[#f7f7f5] flex items-center justify-center">
      <span className="text-ink/30 text-caption tracking-[0.2em] uppercase font-poppins">cargando…</span>
    </div>
  ),
});

export default function Home() {
  const [rawText, setRawText] = useState('');
  const [poem, setPoem] = useState<ParsedPoem | null>(null);
  const [mode, setMode] = useState<VisMode>('blocks');
  const [legendVisible, setLegendVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 520 });

  // Responsive canvas sizing
  useEffect(() => {
    const update = () => {
      const maxW = Math.min(window.innerWidth - 40, 1400);
      setCanvasSize({ w: maxW, h: Math.round(maxW * (520 / 900)) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleSubmit = useCallback((text: string) => {
    setRawText(text);
    setPoem(parsePoem(text));
    setIsEditing(false);
  }, []);

  // ── Landing state: no poem loaded yet ──
  if (!poem) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f7f7f5]">
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          {!isEditing ? (
            <div className="flex flex-col items-center gap-10 text-center max-w-xl animate-fade-in">
              <div className="flex flex-col gap-4">
                <p className="text-caption tracking-[0.3em] uppercase text-ink/40 font-poppins">
                  Perpetuo
                </p>
                <h1 className="text-heading-lg sm:text-display font-serif font-normal text-ink leading-[1.05]">
                  Hola, bienvenido a<br />Geometría Poética
                </h1>
                <p className="text-ink/50 font-poppins text-body leading-relaxed">
                  Convierte un poema en una forma viva — métrica, ritmo y emoción trazados en el espacio.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-7 py-3 border border-ink text-ink text-caption tracking-[0.15em] uppercase font-poppins rounded-badge
                           hover:bg-ink hover:text-[#f7f7f5] transition-colors"
              >
                + Añadir un poema
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl animate-fade-in">
              <PoemInput
                onSubmit={handleSubmit}
                onCancel={() => setIsEditing(false)}
                autoFocus
              />
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── Main app state: poem loaded ──
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f5]">

      {/* ── Header ── */}
      <header className="flex items-end justify-between px-6 pt-7 pb-5 border-b border-ink/10 flex-wrap gap-4">
        <div>
          <h1 className="text-subheading font-poppins font-normal tracking-[0.2em] uppercase text-ink">
            Perpetuo
          </h1>
          <p className="text-caption text-ink/45 mt-0.5 tracking-wide font-poppins">
            geometría viva de la poesía
          </p>
        </div>
        <ModeSelector mode={mode} onChange={setMode} />
      </header>

      {/* ── Canvas ── */}
      <main className="flex-1 flex flex-col px-5 pt-5 pb-3 gap-4 max-w-[1440px] w-full mx-auto">

        {/* Visualization */}
        <div className="w-full border border-ink/12">
          <PoemVisualizer
            poem={poem}
            mode={mode}
            width={canvasSize.w}
            height={canvasSize.h}
          />
        </div>

        {/* Legend */}
        <PoemLegend
          poem={poem}
          visible={legendVisible}
          onToggle={() => setLegendVisible(v => !v)}
        />

        {/* Reading: syllables, structure, form */}
        <div className="border-t border-ink/10 pt-8 mt-2">
          <PoemReading poem={poem} />
        </div>

        {/* Input / change poem */}
        <div className="border-t border-ink/10 pt-4 mt-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-caption tracking-[0.1em] uppercase text-ink/50 hover:text-ink transition-colors border border-ink/20 hover:border-ink px-3 py-1.5 rounded-badge font-poppins"
            >
              ← cambiar poema
            </button>
          ) : (
            <PoemInput
              onSubmit={handleSubmit}
              onCancel={() => setIsEditing(false)}
              initialValue={rawText}
              autoFocus
            />
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-4 flex items-center justify-between border-t border-ink/10">
        <p className="text-caption text-ink/40 tracking-wide font-poppins">
          Cada poema genera una geometría única — metro, ritmo y semántica traducidos en forma
        </p>
        <p className="text-caption text-ink/30 tracking-[0.2em] uppercase font-poppins">perpetuo</p>
      </footer>
    </div>
  );
}
