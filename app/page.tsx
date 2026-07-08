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
    <div className="w-full aspect-[900/520] bg-[#faf8f4] flex items-center justify-center">
      <span className="text-[#2a2723]/30 text-xs tracking-widest uppercase">cargando…</span>
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
      <div className="min-h-screen flex flex-col bg-[#faf8f4]">
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          {!isEditing ? (
            <div className="flex flex-col items-center gap-8 text-center max-w-lg animate-fade-in">
              <div className="flex flex-col gap-3">
                <p className="text-xs tracking-[0.25em] uppercase text-[#2a2723]/40 font-poppins">
                  Perpetuo
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif text-[#2a2723] leading-snug">
                  Hola, bienvenido a Geometría Poética
                </h1>
                <p className="text-[#2a2723]/50 font-poppins text-sm leading-relaxed">
                  Convierte un poema en una forma viva — métrica, ritmo y emoción trazados en el espacio.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="px-7 py-3 bg-[#2a2723] text-[#faf8f4] text-sm font-medium rounded-full
                           hover:bg-[#1a1815] transition-colors"
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
    <div className="min-h-screen flex flex-col bg-[#faf8f4]">

      {/* ── Header ── */}
      <header className="flex items-end justify-between px-6 pt-7 pb-5 border-b border-[#2a2723]/8 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-[0.18em] uppercase text-[#2a2723] font-poppins">
            Perpetuo
          </h1>
          <p className="text-[11px] text-[#2a2723]/45 mt-0.5 tracking-wide font-poppins">
            geometría viva de la poesía
          </p>
        </div>
        <ModeSelector mode={mode} onChange={setMode} />
      </header>

      {/* ── Canvas ── */}
      <main className="flex-1 flex flex-col px-5 pt-5 pb-3 gap-4 max-w-[1440px] w-full mx-auto">

        {/* Visualization */}
        <div
          className="w-full rounded-lg overflow-hidden"
          style={{
            boxShadow: '0 2px 20px rgba(42,39,35,0.06), 0 1px 4px rgba(42,39,35,0.05)',
          }}
        >
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
        <div className="border-t border-[#2a2723]/8 pt-8 mt-2">
          <PoemReading poem={poem} />
        </div>

        {/* Input / change poem */}
        <div className="border-t border-[#2a2723]/8 pt-4 mt-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-[#2a2723]/45 hover:text-[#2a2723]/75 transition-colors border border-[#2a2723]/12 hover:border-[#2a2723]/30 px-3 py-1.5 rounded-full"
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
      <footer className="px-6 py-4 flex items-center justify-between border-t border-[#2a2723]/8">
        <p className="text-[10px] text-[#2a2723]/35 tracking-wider font-poppins">
          Cada poema genera una geometría única — metro, ritmo y semántica traducidos en forma
        </p>
        <p className="text-[10px] text-[#2a2723]/25 font-poppins">perpetuo</p>
      </footer>
    </div>
  );
}
