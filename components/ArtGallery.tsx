'use client';

import { useMemo, useState } from 'react';
import { ParsedPoem } from '@/lib/poemParser';
import { buildFingerprint } from '@/lib/fingerprint';
import { ART_PIECES } from './art';

interface Props {
  poem: ParsedPoem;
  width: number;
  height: number;
}

export default function ArtGallery({ poem, width, height }: Props) {
  const [pieceId, setPieceId] = useState(ART_PIECES[0].meta.id);
  const [showMap, setShowMap] = useState(false);
  const fingerprint = useMemo(() => buildFingerprint(poem), [poem]);
  const piece = ART_PIECES.find(p => p.meta.id === pieceId) ?? ART_PIECES[0];
  const { Component } = piece;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xs tracking-[0.25em] uppercase text-[#2a2723]/45 font-poppins">
            Geometrías
          </h2>
          <p className="text-[11px] text-[#2a2723]/35 mt-1 font-poppins">
            arte generativo a partir de la huella del poema ·{' '}
            {fingerprint.source === 'rantanplan' ? 'métrica: Rantanplan' : 'métrica: análisis local'}
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {ART_PIECES.map(({ meta }) => (
            <button
              key={meta.id}
              onClick={() => setPieceId(meta.id)}
              className={`flex flex-col items-start px-3.5 py-2 rounded-lg border text-left transition-all
                ${pieceId === meta.id
                  ? 'border-[#2a2723]/40 bg-[#2a2723]/[0.06] text-[#2a2723]'
                  : 'border-[#2a2723]/12 text-[#2a2723]/40 hover:text-[#2a2723]/70 hover:border-[#2a2723]/25'}`}
            >
              <span className="text-sm font-medium leading-tight">{meta.label}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{meta.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="w-full rounded-lg overflow-hidden bg-[#faf8f4]"
        style={{ boxShadow: '0 2px 20px rgba(42,39,35,0.06), 0 1px 4px rgba(42,39,35,0.05)' }}
      >
        <Component key={`${piece.meta.id}-${fingerprint.seed}-${fingerprint.source}`} fingerprint={fingerprint} width={width} height={height} />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowMap(v => !v)}
          className="self-start text-[11px] text-[#2a2723]/45 hover:text-[#2a2723]/75 transition-colors font-poppins"
        >
          {showMap ? '− ' : '+ '}qué dibuja el poema · <span className="italic">{piece.meta.themes}</span>
        </button>
        {showMap && (
          <ul className="text-[12px] text-[#2a2723]/60 font-poppins leading-relaxed list-disc pl-5">
            {piece.meta.mappings.map(m => <li key={m}>{m}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
