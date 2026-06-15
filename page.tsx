'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { parsePoem, ParsedPoem } from '@/lib/poemParser';
import PoemInput from '@/components/PoemInput';
import ModeSelector from '@/components/ModeSelector';
import PoemLegend from '@/components/PoemLegend';
import { VisMode } from '@/components/PoemVisualizer';

// Load the canvas component client-only (no SSR)
const PoemVisualizer = dynamic(() => import('@/components/PoemVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[900/520] bg-[#f9f6f1] flex items-center justify-center">
      <span className="text-[#0d52a1]/30 text-xs tracking-widest uppercase">cargando…</span>
    </div>
  ),
});

const DEFAULT_POEM = `Caminante, son tus huellas
el camino y nada más;
caminante, no hay camino,
se hace camino al andar.

Al andar se hace el camino,
y al volver la vista atrás
se ve la senda que nunca
se ha de volver a pisar.

Caminante, son tus huellas
el camino y nada más.`;

export default function Home() {
  const [rawText, setRawText] = useState(DEFAULT_POEM);
  const [poem, setPoem] = useState<ParsedPoem>(() => parsePoem(DEFAULT_POEM));
  const [mode, setMode] = useState<VisMode>('blocks');
  const [legendVisible, setLegendVisible] = useState(false);
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
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f9f6f1]">

      {/* ── Header ── */}
      <header className="flex items-end justify-between px-6 pt-7 pb-5 border-b border-[#0d52a1]/10">
        <div>
          <h1 className="text-xl font-semibold tracking-[0.18em] uppercase text-[#0d52a1] font-poppins">
            Perpetuo
          </h1>
          <p className="text-[11px] text-[#0d52a1]/50 mt-0.5 tracking-wide">
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
            boxShadow: '0 2px 20px rgba(13,82,161,0.08), 0 1px 4px rgba(13,82,161,0.06)',
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

        {/* Input */}
        <div className="border-t border-[#0d52a1]/10 pt-4 mt-1">
          <PoemInput onSubmit={handleSubmit} initialValue={rawText} />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-4 flex items-center justify-between border-t border-[#0d52a1]/10">
        <p className="text-[10px] text-[#0d52a1]/40 tracking-wider">
          Cada poema genera una geometría única — metro, ritmo y semántica traducidos en forma
        </p>
        <p className="text-[10px] text-[#0d52a1]/30 font-poppins">perpetuo</p>
      </footer>
    </div>
  );
}
