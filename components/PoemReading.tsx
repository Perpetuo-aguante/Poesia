'use client';

import { ParsedPoem } from '@/lib/poemParser';

interface Props {
  poem: ParsedPoem;
}

export default function PoemReading({ poem }: Props) {
  const stanzaSizes = poem.stanzas.map(s => s.verses.length);

  return (
    <div className="w-full max-w-[720px] mx-auto flex flex-col gap-8 font-serif text-[#2a2723]">

      {/* Type & structure summary */}
      <div className="flex flex-col gap-1.5 text-center">
        <p className="text-lg tracking-tight">
          {poem.form.name}
          <span className="text-[#2a2723]/40"> · </span>
          {poem.form.meterName}
          {!poem.form.isRegular && poem.form.name !== 'Verso libre' ? ' irregular' : ''}
        </p>
        <p className="text-sm text-[#2a2723]/50 font-poppins">
          {poem.stanzas.length} {poem.stanzas.length === 1 ? 'estrofa' : 'estrofas'}
          {' · '}
          {stanzaSizes.join('-')} {stanzaSizes.every(n => n === 1) ? 'verso' : 'versos'} por estrofa
          {' · '}
          promedio {poem.avgSyllables.toFixed(1)} sílabas/verso
        </p>
      </div>

      {/* Per-verse syllable reading */}
      <div className="flex flex-col gap-6">
        {poem.stanzas.map(stanza => (
          <div key={stanza.index} className="flex flex-col gap-1">
            {stanza.verses.map(v => (
              <div
                key={v.verseIndex}
                className="flex items-baseline gap-3 py-0.5 border-b border-[#2a2723]/[0.06]"
              >
                <span className="flex-1 text-[15px] leading-relaxed italic">
                  {v.text}
                </span>
                <span className="text-xs text-[#2a2723]/40 font-poppins tabular-nums whitespace-nowrap">
                  {v.syllables} síl.
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
